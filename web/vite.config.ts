import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    // several tests render the whole app with the real data; with every file in parallel they can pass 5 s
    testTimeout: 15_000,
  },
});
