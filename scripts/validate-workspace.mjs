import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const packageRoots = ["apps", "packages"];
const manifests = [];
const failures = [];

for (const packageRoot of packageRoots) {
  const directory = path.join(root, packageRoot);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(directory, entry.name, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifests.push({ directory: path.dirname(manifestPath), manifest, manifestPath });
  }
}

const names = new Set();
for (const { directory, manifest, manifestPath } of manifests) {
  if (!/^@better-spa\/[a-z0-9-]+$/.test(manifest.name ?? "")) {
    failures.push(`${path.relative(root, manifestPath)} has invalid name ${manifest.name}`);
  }
  if (names.has(manifest.name)) failures.push(`Duplicate package name ${manifest.name}`);
  names.add(manifest.name);

  for (const [exportName, target] of Object.entries(manifest.exports ?? {})) {
    if (typeof target !== "string" || !existsSync(path.resolve(directory, target))) {
      failures.push(`${manifest.name} export ${exportName} does not resolve: ${String(target)}`);
    }
  }
}

const rootManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
for (const script of [
  "dev",
  "build",
  "build:node",
  "build:worker",
  "preview",
  "start",
  "db:up",
  "db:down",
  "db:migrate",
  "db:snapshot",
  "auth:secret",
  "auth:generate",
  "ui",
  "check",
  "check:build",
  "check:full",
  "worker:types",
  "worker:preview",
  "worker:deploy",
]) {
  if (!rootManifest.scripts?.[script]) failures.push(`Missing root proxy script ${script}`);
}

const browserRoots = [
  path.join(root, "apps/web/src/components"),
  path.join(root, "apps/web/src/lib"),
  path.join(root, "apps/web/src/routes"),
];
const forbidden = [
  "node:",
  "pg",
  "kysely",
  "@better-spa/db",
  "@better-spa/observability",
  "@better-spa/auth/server",
  "@better-spa/rpc/context",
  "@better-spa/rpc/rate-limiter",
  "@better-spa/rpc/storage",
];

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (filePath.includes(`${path.sep}routes${path.sep}api`)) continue;
      await inspect(filePath);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith(".server.ts")) continue;
    const source = await readFile(filePath, "utf8");
    for (const match of source.matchAll(/import\s+(?!type\b)[\s\S]*?\sfrom\s+["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (
        specifier &&
        forbidden.some((value) => specifier === value || specifier.startsWith(value))
      ) {
        failures.push(`${path.relative(root, filePath)} imports server-only module ${specifier}`);
      }
    }
  }
}

for (const directory of browserRoots) await inspect(directory);

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Workspace metadata valid (${manifests.length} packages).`);
}
