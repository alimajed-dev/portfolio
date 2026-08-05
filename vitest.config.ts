import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * No React plugin: Fast Refresh is meaningless in a test run, and Vitest's own
 * esbuild transform already picks up `"jsx": "react-jsx"` from tsconfig.json.
 * Leaving it out also keeps a second copy of Vite out of the dependency tree.
 *
 * Node is the default environment because most of what is worth testing here is
 * server-side or pure. Component and hook tests opt into jsdom with a
 * `@vitest-environment jsdom` docblock rather than paying for a DOM everywhere.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    restoreMocks: true,
  },
});
