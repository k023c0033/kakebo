import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages では https://k023c0033.github.io/kakebo/ で公開するので、base を /kakebo/ にする
export default defineConfig({
  base: '/kakebo/',
  plugins: [react()],
})
