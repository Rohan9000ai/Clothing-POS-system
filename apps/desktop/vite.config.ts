import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "src/renderer"),
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@muzammil-pos/types": path.resolve(__dirname, "../../packages/types/index.ts"),
      "@muzammil-pos/validation": path.resolve(__dirname, "../../packages/validation/index.ts"),
      "@muzammil-pos/utils": path.resolve(__dirname, "../../packages/utils/index.ts"),
      "@muzammil-pos/ui": path.resolve(__dirname, "../../packages/ui/index.ts"),
    },
  },
  optimizeDeps: {
    exclude: [
      "@muzammil-pos/types",
      "@muzammil-pos/validation",
      "@muzammil-pos/utils",
      "@muzammil-pos/ui",
    ],
  },
});