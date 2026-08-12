import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [
          { name: "charts", test: /node_modules\/(recharts|d3-|victory-vendor)/ },
          { name: "ui", test: /node_modules\/@radix-ui/ },
          { name: "react", test: /node_modules\/(react|react-dom|react-router)/ },
          { name: "icons", test: /node_modules\/lucide-react/ },
          { name: "data", test: /node_modules\/(@tanstack|date-fns|zod)/ },
        ] },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
