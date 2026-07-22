import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'
import { submitBundle } from '../bundle-store.js'

const TEMPLATE = './register/submit.njk'
const PAGE_TITLE = 'Now submit your cattle registration'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const submitController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel(request.params.bundleId))
  }
}

export const submitSubmitController = {
  options: {},
  handler(request, h) {
    // do the submit to api
    submitBundle(request.params.bundleId, request.app.hubAuth)
    return h.redirect(bundlePath(request.params.bundleId, 'confirmation'))
  }
}

function viewModel(bundleId) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    message: 'Your cattle birth report has been submitted.',
    postBackUrl: bundlePath(bundleId, 'submit'),
    nextUrl: ROOT_PATH
  }
}

function bundlePath(bundleId, page) {
  return `${ROOT_PATH}/bundles/${encodeURIComponent(bundleId)}/${page}`
}
