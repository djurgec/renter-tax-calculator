import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development the API runs separately (`uv run porezni-kompas-api`); the proxy keeps
// the frontend on the same origin so no CORS setup is needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.PK_API_URL ?? 'http://127.0.0.1:8000' } },
  },
})
