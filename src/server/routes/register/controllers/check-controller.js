import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

const TEMPLATE = './register/check.njk'
const PAGE_TITLE = 'Check calf details'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const checkController = {
  handler(_request, h) {
    return h.view(TEMPLATE, viewModel())
  }
}

export const checkSubmitController = {
  options: {},
  handler(_request, h) {
    return h.redirect(`${ROOT_PATH}/submission-list`)
  }
}

function viewModel(overrides = {}) {
  const formValues = overrides.formValues ?? defaultFormValues()
  const errors = overrides.errors ?? {}

  return {
    pageTitle: withErrorPageTitle(PAGE_TITLE, errors),
    heading: PAGE_TITLE,
    postBackUrl: `${ROOT_PATH}/check`,
    formValues,
    errors,
    errorList: errorListFromErrors(errors)
  }
}

function defaultFormValues() {
  const damDetails = []
  const damType = 'surrogate'
  if (damType === 'surrogate') {
    damDetails.push(
      buildRow('Genetic dam ear tag number', 'X', `${ROOT_PATH}/genetic-dam`)
    )
  } else {
    damDetails.push(
      buildRow('Genetic dam ear tag number', 'X', `${ROOT_PATH}/surrogate-dam`),
      buildRow(
        'Surrogate dam ear tag number',
        'X',
        `${ROOT_PATH}/surrogate-dam`
      )
    )
  }

  return {
    rows: [
      buildRow('Animal ear tag number', 'X', `${ROOT_PATH}/calf`),
      buildRow('Date of birth', 'X', `${ROOT_PATH}/calf`),
      buildRow('Sex', 'X', `${ROOT_PATH}/calf`),
      buildRow('Breed', 'X', `${ROOT_PATH}/calf`),
      buildRow('Dam type', 'X', `${ROOT_PATH}/dam`),
      ...damDetails,
      buildRow('Sire ear tag number', 'X', `${ROOT_PATH}/sire`),
      buildRow('Sire name', 'X', `${ROOT_PATH}/sire`)
    ]
  }
}

function errorListFromErrors(errors) {
  return Object.entries(errors).map(([field, text]) => ({
    text,
    href: `#${field}`
  }))
}

function withErrorPageTitle(title, errors = {}) {
  return Object.keys(errors).length ? `Error: ${title}` : title
}

function buildRow(key, text, url) {
  return {
    key: {
      text: key
    },
    value: {
      text
    },
    actions: {
      items: [
        {
          href: `${url}?change=true`,
          text: 'Change'
        }
      ]
    }
  }
}
