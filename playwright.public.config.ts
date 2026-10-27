import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "public.spec.ts",
  outputDir: "test-results-public",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: [{ command: "npm run build:web && npm run preview", port: 4173, reuseExistingServer: true, timeout: 240000 }]
});
