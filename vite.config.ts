// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
// Импортируем плагин
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    // Добавляем плагин nodePolyfills ПЕРЕД другими плагинами
    nodePolyfills({
      // Включаем полифилы для buffer и util
      protocolImports: true,
      globals: {
        Buffer: true, // Включить Buffer
        global: true,
        process: true,
      }
    }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Попробуем уменьшить размер бандла
    chunkSizeWarningLimit: 1000, // Увеличиваем лимит для предупреждения
    rollupOptions: {
      // Попробуем разделить код на чанки
      output: {
        manualChunks: {
          // Разделяем крупные библиотеки
          'near-api': ['near-api-js'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'], // если используете
        }
      }
    }
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
