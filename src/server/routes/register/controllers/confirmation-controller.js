import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

const TEMPLATE = './register/confirmation.njk'
const PAGE_TITLE = 'Cattle birth report sent'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const confirmationController = {
  handler(_request, h) {
    return h.view(TEMPLATE, viewModel())
  }
}

function viewModel() {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    message: 'Your cattle birth report has been submitted.',
    nextUrl: `${ROOT_PATH}/home`
  }
}
