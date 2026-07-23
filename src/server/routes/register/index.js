import { routes } from './routes.js'
import { canAccessCph, getBundleForUser } from './bundle-store.js'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { cphFromParams } from './paths.js'

export const register = {
  plugin: {
    name: 'register',
    register(server, options = {}) {
      server.route(
        routes({
          ...options
        })
      )

      // eslint-disable-next-line sonarjs/cyclomatic-complexity
      server.ext('onPreHandler', (request, h) => {
        const { bundleId, calfId } = request.params
        const cph = cphFromParams(request.params)
        if (cph && !canAccessCph(request.app.hubAuth, cph)) {
          return h
            .response('Page not found')
            .code(statusCodes.notFound)
            .takeover()
        }
        const bundle = bundleId
          ? getBundleForUser(bundleId, request.app.hubAuth)
          : null
        if (bundleId && (!bundle || bundle.cph !== cph)) {
          return h
            .response('Registration not found')
            .code(statusCodes.notFound)
            .takeover()
        }
        const calf = calfId
          ? bundle?.calves.find(
              (candidate) => (candidate.id ?? candidate.tag) === calfId
            )
          : null
        if (calfId && !calf) {
          return h
            .response('Page not found')
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

        request.app.cph = cph
        request.app.bundle = bundle
        request.app.calf = calf

        return h.continue
      })
    }
  }
}
