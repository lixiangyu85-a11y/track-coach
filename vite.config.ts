import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Actions sets CI=true; Pages is served under /track-coach/
export default defineConfig({
  plugins: [react()],
  base: process.env.CI ? '/track-coach/' : '/',
})
