import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "antd-icons",
              test: /[\\/]node_modules[\\/]@ant-design[\\/]icons/,
              priority: 20,
            },
            {
              name: "rc-vendor",
              test: /[\\/]node_modules[\\/](?:@rc-component|rc-)/,
              priority: 15,
            },
            {
              name: "antd-vendor",
              test: /[\\/]node_modules[\\/](?:antd|@ant-design)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    strictPort: true,
    proxy: {
      "/api/v1/health": "http://127.0.0.1:8000",
      "/api/v1/api-explorer/entities": "http://127.0.0.1:8000",
      "/api/v1/api-explorer/custom-entities": "http://127.0.0.1:8000",
      "/api/v1/api-explorer/customers/preview": "http://127.0.0.1:8000",
      "/api/v1/api-explorer/items/preview": "http://127.0.0.1:8000",
      "/api/v1/permission-analyzer/users": "http://127.0.0.1:8000",
      "/api/v1/permission-analyzer/objects": "http://127.0.0.1:8000",
      "/api/v1/permission-analyzer/diff": "http://127.0.0.1:8000",
    },
  },
});
