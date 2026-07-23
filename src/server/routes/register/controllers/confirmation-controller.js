import { holdingRoot } from '../paths.js'

const TEMPLATE = './register/confirmation.njk'
const PAGE_TITLE = 'Cattle birth report sent'

export const confirmationController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel(request.app.cph, request.params.bundleId))
  }
}

function viewModel(cph, bundleId) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    titleText: PAGE_TITLE,
    txn_ref: bundleId,
    message: 'Your cattle birth report has been submitted.',
    nextUrl: holdingRoot(cph)
  }
}
