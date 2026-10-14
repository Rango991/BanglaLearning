import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative paths so the bundle loads from inside the Android app.
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    testTimeout: 60000,
  },
});
