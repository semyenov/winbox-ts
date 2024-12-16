import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import tailwindcss from "tailwindcss";
import nesting from "tailwindcss/nesting";

// https://vite.dev/config/
export default defineConfig({
  publicDir: "./public",
  preview: {
    port: 3000,
    open: true,
  },
  build: {
    copyPublicDir: false,
    assetsDir: "./assets",
    cssCodeSplit: true,
    outDir: "./dist",
    target: "esnext",
    minify: true,
    lib: {
      name: "winbox",
      entry: ["./src/winbox.ts", "./src/assets/css/winbox.css"],
      cssFileName: "winbox.css",
      formats: ["es", "cjs"],
      fileName(format, entryName) {
        return format === "es" ? `${entryName}.mjs` : `${entryName}.cjs`;
      },
    },
  },
  css: {
    postcss: {
      plugins: [
        nesting,
        tailwindcss({
          config: {
            content: [
              "./index.html",
              "./src/**/*.{js,ts,jsx,tsx}",
              "./src/assets/css/**/*.css",
              "./src/assets/img/**/*.svg",
            ],
          },
        }),
      ],
    },
  },
  plugins: [
    svgr({
      svgrOptions: {
        typescript: true,
      },
    }),
  ],
});
