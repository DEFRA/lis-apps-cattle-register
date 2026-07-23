import { addDemoCalf } from '../bundle-store.js'
import { bundlePath, bundleRoot } from '../paths.js'

const TEMPLATE = './register/check.njk'
const PAGE_TITLE = 'Check calf details'

export const checkController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel(requestContext(request)))
  }
}

export const checkSubmitController = {
  options: {},
  handler(request, h) {
    addDemoCalf(request.params.bundleId, request.app.hubAuth)
    return h.redirect(bundleRoot(request.app.cph, request.params.bundleId))
  }
}

function viewModel(overrides = {}) {
  const formValues =
    overrides.formValues ?? defaultFormValues(overrides.cph, overrides.bundleId)
  const errors = overrides.errors ?? {}

  return {
    pageTitle: withErrorPageTitle(PAGE_TITLE, errors),
    heading: PAGE_TITLE,
    backUrl: bundlePath(overrides.cph, overrides.bundleId, 'sire'),
    postBackUrl: bundlePath(overrides.cph, overrides.bundleId, 'check'),
    formValues,
    errors,
    errorList: errorListFromErrors(errors)
  }
}

function defaultFormValues(cph, bundleId) {
  const root = bundleRoot(cph, bundleId)
  const damDetails = []
  const damType = 'surrogate'
  if (damType === 'surrogate') {
    damDetails.push(
      buildRow('Genetic dam ear tag number', 'X', `${root}/genetic-dam`)
    )
  } else {
    damDetails.push(
      buildRow('Genetic dam ear tag number', 'X', `${root}/surrogate-dam`),
      buildRow('Surrogate dam ear tag number', 'X', `${root}/surrogate-dam`)
    )
  }

  return {
    rows: [
      buildRow('Animal ear tag number', 'X', `${root}/calf`),
      buildRow('Date of birth', 'X', `${root}/calf`),
      buildRow('Sex', 'X', `${root}/calf`),
      buildRow('Breed', 'X', `${root}/calf`),
      buildRow('Dam type', 'X', `${root}/dam`),
      ...damDetails,
      buildRow('Sire ear tag number', 'X', `${root}/sire`),
      buildRow('Sire name', 'X', `${root}/sire`)
    ]
  }
}

function requestContext(request) {
  return { cph: request.app.cph, bundleId: request.params.bundleId }
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
