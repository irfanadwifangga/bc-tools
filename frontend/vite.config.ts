import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    strictPort: true,
    proxy: {
      "/api/v1/api-explorer/entities": "http://127.0.0.1:8000",
      "/api/v1/api-explorer/customers/preview": "http://127.0.0.1:8000",
      "/api/v1/api-explorer/items/preview": "http://127.0.0.1:8000",
    },
  },
});
