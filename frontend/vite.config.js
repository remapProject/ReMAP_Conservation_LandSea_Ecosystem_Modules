import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import vuetify from 'vite-plugin-vuetify'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port:5175,
    fs: {
      allow: ['..']
    }
  },
  build: {
    sourcemap: true  // Habilitar mapas de origen
  },
  worker: {
    format: 'es'
  },
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    vuetify({autoImport:true})
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "vuetify/dist/vuetify.min.css";`
      }
    }
  }
})
