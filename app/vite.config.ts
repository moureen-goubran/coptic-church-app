import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  server: { fs: { allow: [".."] } },
  build: { target: "es2020", sourcemap: false, chunkSizeWarningLimit: 1200 },
});
