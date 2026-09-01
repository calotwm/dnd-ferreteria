import { defineConfig, devices } from "@playwright/test";

// E2E harness config: run against the deployed Railway origin instead of a
// local Vite dev server. No webServer block — the target is already live.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "https://dnd-ferreteria-production.up.railway.app",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
