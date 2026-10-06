import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tools/e2e/*.e2e.ts"],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
