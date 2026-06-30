import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

const TEMPLATE = 'summary.njk'
const PAGE_TITLE = 'Check your cattle birth report details'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const summaryController = {
  handler(_request, h) {
    return h.view(TEMPLATE, viewModel())
  }
}

export const summarySubmitController = {
  options: {},
  handler(_request, h) {
    return h.redirect(`${ROOT_PATH}/result`)
  }
}

function viewModel() {
  const data = {
    tag: '123',
    calfName: 'bob',
    dob: '01/01/2002',
    breed: 'moo',
    sex: 'male',
    surrogate: 'No',
    genetic_dam: '12341243',
    dam_breed: 'moo2',
    assistance: 'jack',
    identifySire: '12341243'
  }

  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    rows: createSummaryItems(data),
    postBackUrl: `${ROOT_PATH}/summary`
  }
}

function createSummaryItems(data) {
  const basicDetails = [data.tag, data.calfName, data.dob, data.breed, data.sex]
    .filter((value) => value.length > 0)
    .join('<BR/>')

  const transfer =
    data.transfer === 'yes' ? `Yes - surrogate ${data.surrogate}` : 'No'
  const damDetails = [
    transfer,
    data.genetic_dam,
    data.dam_breed,
    data.assistance
  ]
    .filter((value) => value.length > 0)
    .join('<BR/>')

  const sireDetails = [data.identifySire]
    .filter((value) => value.length > 0)
    .join('<BR/>')

  return [
    createSummaryItem('Basic details', basicDetails, `${ROOT_PATH}/basic`),
    createSummaryItem('Dam details', damDetails, `${ROOT_PATH}/dam`),
    createSummaryItem('Sire details', sireDetails, `${ROOT_PATH}/sire`)
  ]
}

function createSummaryItem(key, value, href, actionText = 'Change') {
  return {
    key: {
      text: key
    },
    value: {
      html: value
    },
    actions: {
      items: [
        {
          href,
          text: actionText
        }
      ]
    }
  }
}
