import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    environment: "node",
    setupFiles: ["./src/common/rate-limit/test-setup.ts"],
    env: {
      UPSTASH_REDIS_REST_URL: "https://redis.example.com",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    },
  },
});
