import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true // 로컬 네트워크 및 IPv4 바인딩 허용
  }
});