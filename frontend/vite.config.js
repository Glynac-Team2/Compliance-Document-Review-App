import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            // Lets the frontend call /api/... in dev without CORS headaches;
            // change the target if the backend runs somewhere else.
            "/api": {
                target: process.env.VITE_API_URL || "http://localhost:8000",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});
