import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

const TEMPLATE = './register/submit.njk'
const PAGE_TITLE = 'Now submit your cattle registration'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const submitController = {
  handler(_request, h) {
    return h.view(TEMPLATE, viewModel())
  }
}

export const submitSubmitController = {
  options: {
  },
  handler(_request, h) {
    // do the submit to api
    return h.redirect(`${ROOT_PATH}/result`)
  }}

function viewModel() {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    message: 'Your cattle birth report has been submitted.',
    nextUrl: `${ROOT_PATH}/home`
  }
}
