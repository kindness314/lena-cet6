import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Lena",
        short_name: "Lena",
        description: "每天 12 条消息的六级词卡",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#101014",
        theme_color: "#101014",
        lang: "zh-CN",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,json}"],
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        navigateFallback: "index.html",
      },
    }),
  ],
});
