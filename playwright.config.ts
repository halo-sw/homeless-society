import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "e2e.spec.ts",
  outputDir: "test-results",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5173" },
  webServer: [{ command: "npm run dev", port: 5173, reuseExistingServer: true, timeout: 120000 }]
});
