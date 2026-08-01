import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const requiredNodeMajor = 24;
const requiredPnpm = "11.17.0";

if (Number(process.versions.node.split(".")[0]) !== requiredNodeMajor) {
  throw new Error(`Node ${requiredNodeMajor} is required; found ${process.version}`);
}

const pnpmVersion = execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim();
if (pnpmVersion !== requiredPnpm) {
  throw new Error(`pnpm ${requiredPnpm} is required; found ${pnpmVersion}`);
}

const envPath = path.join(root, ".env");
let envWasCreated = false;
if (!existsSync(envPath)) {
  await copyFile(path.join(root, ".env.example"), envPath);
  envWasCreated = true;
}

let envSource = await readFile(envPath, "utf8");
const secretMatch = envSource.match(/^BETTER_AUTH_SECRET=(.*)$/m);
let secretWasGenerated = false;
if (!secretMatch?.[1]?.trim()) {
  const secret = randomBytes(32).toString("base64url");
  envSource = secretMatch
    ? envSource.replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET=${secret}`)
    : `${envSource.trimEnd()}\nBETTER_AUTH_SECRET=${secret}\n`;
  await writeFile(envPath, envSource);
  secretWasGenerated = true;
}
if (envWasCreated || secretWasGenerated) await chmod(envPath, 0o600);

for (const name of ["DATABASE_URL", "VITE_BASE_URL", "BETTER_AUTH_SECRET"]) {
  if (!new RegExp(`^${name}=.+$`, "m").test(envSource)) {
    throw new Error(`Missing required ${name} in .env`);
  }
}

execFileSync("docker", ["compose", "up", "-d", "--wait"], { cwd: root, stdio: "inherit" });
execFileSync("pnpm", ["db:migrate"], { cwd: root, stdio: "inherit" });
const configuredUrl = envSource
  .match(/^VITE_BASE_URL=(.+)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, "");
console.log(`KitKit is ready at ${configuredUrl}`);
