import { apiUrl } from "./config";

export type ApiHealth = {
  status: "ok";
  runtime: string;
  requestId: string;
};

export const apiHealthUrl = `${apiUrl}/api/health/live`;

export async function getApiHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const response = await fetch(apiHealthUrl, { signal });
  if (!response.ok) {
    throw new Error(`Health request failed with HTTP ${response.status}`);
  }

  const health: unknown = await response.json();
  if (
    typeof health !== "object" ||
    health === null ||
    !("status" in health) ||
    health.status !== "ok" ||
    !("runtime" in health) ||
    typeof health.runtime !== "string" ||
    !("requestId" in health) ||
    typeof health.requestId !== "string"
  ) {
    throw new Error("Health request returned an invalid response");
  }

  return health as ApiHealth;
}
