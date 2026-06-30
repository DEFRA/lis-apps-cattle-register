import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

const TEMPLATE = 'home.njk'
const PAGE_TITLE = 'Before you begin'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const homeController = {
  handler(_request, h) {
    return h.view(TEMPLATE, viewModel())
  }
}

function viewModel() {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    nextUrl: `${ROOT_PATH}/basic`
  }
}
