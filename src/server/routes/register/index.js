import { routes } from './routes.js'
import { getBundleForUser } from './bundle-store.js'
import { statusCodes } from '@livestock/ui-services/status-codes'

export const register = {
  plugin: {
    name: 'register',
    register(server, options = {}) {
      server.route(
        routes({
          ...options
        })
      )

      server.ext('onPreHandler', (request, h) => {
        const { bundleId } = request.params
        const bundle = bundleId
          ? getBundleForUser(bundleId, request.app.hubAuth)
          : null
        if (bundleId && !bundle) {
          return h
            .response('Registration not found')
            .code(statusCodes.notFound)
            .takeover()
        }

        const isReadOnlyView =
          request.route.path.endsWith('/bundles/{bundleId}') ||
          request.route.path.endsWith('/confirmation')
        if (bundle && bundle.status !== 'draft' && !isReadOnlyView) {
          return h
            .response('Registration is read only')
            .code(statusCodes.conflict)
            .takeover()
        }

        return h.continue
      })
    }
  }
}
