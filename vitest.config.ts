import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  plugins: [],
  test: {
    // Use jsdom for component tests
    environment: "jsdom",

    // Setup files run before each test file
    setupFiles: ["./tests/setup.ts"],

    // Global test utilities (describe, it, expect) available without import
    globals: true,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "tests/e2e/**",
        "**/*.config.*",
        "**/types/**",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },

    // Test file patterns
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
      "tests/components/**/*.test.tsx",
      "tests/properties/**/*.test.ts",
    ],

    // Exclude E2E tests (handled by Playwright)
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],

    // Timeout for async tests (property-based tests may need more time)
    testTimeout: 30000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
