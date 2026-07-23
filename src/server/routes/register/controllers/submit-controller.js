import { submitBundle } from '../bundle-store.js'
import { bundlePath, holdingRoot } from '../paths.js'

const TEMPLATE = './register/submit.njk'
const PAGE_TITLE = 'Now submit your cattle registration'

export const submitController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel(request.app.cph, request.params.bundleId))
  }
}

export const submitSubmitController = {
  options: {},
  handler(request, h) {
    // do the submit to api
    submitBundle(request.params.bundleId, request.app.hubAuth)
    return h.redirect(
      bundlePath(request.app.cph, request.params.bundleId, 'confirmation')
    )
  }
}

function viewModel(cph, bundleId) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    message: 'Your cattle birth report has been submitted.',
    postBackUrl: bundlePath(cph, bundleId, 'submit'),
    nextUrl: holdingRoot(cph)
  }
}
