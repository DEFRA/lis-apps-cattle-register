import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { NodePackageImporter } from 'sass-embedded'
import { getMountPath } from '@defra/lis-hubs-infra-registry'

const dirname = path.dirname(fileURLToPath(import.meta.url))
export default defineConfig({
  // Built assets are served at the module's assets mount, which the hub proxies to this spoke.
  base: getMountPath('cattle-register', 'assets'),
  build: {
    outDir: '.public',
    manifest: true,
    rolldownOptions: {
      input: {
        htmlAssets: 'src/client/assets.html',
        application: 'src/client/javascripts/application.js',
        applicationCss: 'src/client/stylesheets/application.scss'
      }
    },
    sourcemap: true
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        importers: [new NodePackageImporter(dirname)],
        loadPaths: [
          'node_modules',
          'src/client/stylesheets',
          'src/server',
          'src/server/common/components',
          'src/server/common/templates/partials'
        ],
        quietDeps: true,
        sourceMapIncludeSources: true,
        style: 'expanded'
      }
    },
    lightningcss: { errorRecovery: true }
  },
  server: {
    hmr: {
      port: 0
    }
  }
})
