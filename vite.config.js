import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages では https://rinchan-codes.github.io/kakebo/ で公開するので、base を /kakebo/ にする
export default defineConfig({
  base: '/kakebo/',
  plugins: [react()],
  // 同期用の Firebase の部品（約600KB）は、同期を使うときだけ別に読み込むので大きくてよい
  build: { chunkSizeWarningLimit: 700 },
})
