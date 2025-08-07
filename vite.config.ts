// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
// Импортируем плагин (убедитесь, что он установлен через package.json)
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    // Добавляем плагин nodePolyfills ПЕРЕД другими плагинами
    nodePolyfills({
      // Включаем полифилы для buffer и других Node.js модулей
      protocolImports: true,
      globals: {
        Buffer: true, // Включить Buffer
        global: true,
        process: true,
      }
    }),
    react(),
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
    // Уберем проблемную часть manualChunks
    // Если захотите оптимизировать размер бандла позже, можно будет сделать это правильно,
    // но без указания несуществующих точек входа.
    // Оставим стандартные настройки или добавим простые manualChunks при необходимости.
    /*
    rollupOptions: {
      output: {
        // Пример простого manualChunks (опционально):
        // manualChunks: {
        //   'vendor': ['react', 'react-dom'], // Группируем основные зависимости
        //   'near': ['near-api-js', '@hot-labs/near-connect'] // Группируем NEAR-зависимости
        // }
        // НО НЕ ДОБАВЛЯЕМ react-router-dom, если он у вас не используется как точка входа!
      }
    }
    */
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
