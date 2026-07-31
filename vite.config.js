import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(),tailwindcss()],
  base: './', // Electron file path support ke liye
  build: {
    outDir: 'dist'
  }
})