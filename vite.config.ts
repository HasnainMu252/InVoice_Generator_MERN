import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    // Lets the app call /api/* in dev without CORS or a hardcoded host.
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        /*
         * Only the framework is split out, and only via the function form.
         * The object form pulled recharts/jsPDF into the entry's preload graph,
         * which made the login page download ~1.2MB of code it never used.
         * Everything else is left to Vite's automatic dynamic-import splitting.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return "vendor-react";
          }
          return undefined;
        },
      },
    },
  },
});
