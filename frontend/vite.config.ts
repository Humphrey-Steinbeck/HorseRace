import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: Number(process.env.PORT || process.env.VITE_PORT || 5173),
    host: true,
    strictPort: false,
  },
});


