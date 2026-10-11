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
      STORAGE_ENDPOINT: "http://localhost:4566",
      STORAGE_REGION: "us-east-1",
      STORAGE_BUCKET: "test-bucket",
      STORAGE_ACCESS_KEY_ID: "test-access",
      STORAGE_SECRET_ACCESS_KEY: "test-secret",
      SQS_QUEUES_URLS: '{"memories":"http://localhost:4566/000000000000/images"}',
      AWS_REGION: "us-east-1",
    },
  },
});
