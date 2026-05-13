import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Playwright specs live in /e2e and are run via `npm run test:e2e`.
    // Exclude them from vitest so it doesn't try to load Playwright's
    // browser globals.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
