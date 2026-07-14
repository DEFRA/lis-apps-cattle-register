import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { NodePackageImporter } from 'sass-embedded'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const assetBasePath = '/public'

function resolveSpokeBasePath() {
  const [species, taxonomy] = path.basename(dirname).split('-')
  return `/${species}/${taxonomy}`
}

export default defineConfig({
  base: `${resolveSpokeBasePath()}${assetBasePath}`,
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
  // Dev server
  server: {
    allowedHosts: ['front-office.lis.defra', 'back-office.lis.defra'],
    hmr: {
      port: 0
    }
  }
})
