import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { NodePackageImporter } from 'sass-embedded'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const assetBasePath = '/public'

function stripSlashes(value) {
  const start = value.indexOf('/') === 0 ? 1 : 0
  const end =
    value.lastIndexOf('/') === value.length - 1
      ? value.length - 1
      : value.length

  return value.slice(start, end)
}

function resolveViteBase(basePath = '') {
  const normalizedBasePath =
    basePath && basePath !== '/' ? `/${stripSlashes(basePath)}` : ''

  return `${normalizedBasePath}${assetBasePath}`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dirname, '')

  return {
    base: resolveViteBase(env.BASE_PATH),
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
  }
})
