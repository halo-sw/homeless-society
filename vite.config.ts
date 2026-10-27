import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isPublic = mode === "public";
  return {
    plugins: [react()],
    server: { host: "127.0.0.1", port: 5173, proxy: { "/api": "http://127.0.0.1:3001" } },
    preview: { host: "127.0.0.1", port: 4173 },
    define: {
      "import.meta.env.VITE_PUBLIC_DEMO": JSON.stringify(isPublic ? "true" : "false")
    },
    test: { include: ["tests/**/*.test.ts"], environment: "node" }
  };
});
