import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "seo/index": "src/seo/index.ts",
    "server/index": "src/server/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "react-dom/client",
    "react-dom/server",
    "@inertiajs/react",
    "@inertiajs/react/server",
    "@particle-academy/react-fancy",
    "@particle-academy/fancy-echarts",
    "@particle-academy/fancy-screens",
  ],
  treeshake: true,
});
