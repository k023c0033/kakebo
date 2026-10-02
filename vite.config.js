import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages では https://rinchan-codes.github.io/kakebo/ で公開するので、base を /kakebo/ にする
export default defineConfig({
  base: '/kakebo/',
  plugins: [react()],
})
