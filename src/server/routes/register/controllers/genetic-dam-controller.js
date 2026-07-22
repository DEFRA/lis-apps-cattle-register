import Joi from 'joi'
import { buildMicrositePath } from '@livestock/ui-services'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

const TEMPLATE = './register/genetic-dam.njk'
const PAGE_TITLE = 'Genetic Dam details'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const geneticDamController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel({ bundleId: request.params.bundleId }))
  }
}

export const geneticDamSubmitController = {
  options: {
    validate: {
      payload: Joi.object({
        genetic_dam_tag: Joi.string().trim().min(1).required()
      }),
      failAction(request, h, err) {
        const formValues = formValuesFromPayload(request.payload)
        const errors = errorsFromValidation(err)

        return h
          .view(
            TEMPLATE,
            viewModel({ formValues, errors, bundleId: request.params.bundleId })
          )
          .code(statusCodes.badRequest)
          .takeover()
      }
    }
  },
  handler(request, h) {
    return h.redirect(bundlePath(request.params.bundleId, 'sire'))
  }
}

function errorsFromValidation(validationError) {
  const errors = {}
  const details =
    validationError?.details ?? validationError?.data?.details ?? []

  for (const detail of details) {
    if (detail?.path?.[0] === 'genetic_dam_tag') {
      errors.genetic_dam_tag = 'Enter the ear tag number of the genetic dam'
    }
  }

  return errors
}

function viewModel(overrides = {}) {
  const formValues = overrides.formValues ?? defaultFormValues()
  const errors = overrides.errors ?? {}

  return {
    pageTitle: withErrorPageTitle(PAGE_TITLE, errors),
    heading: PAGE_TITLE,
    postBackUrl: bundlePath(overrides.bundleId, 'genetic-dam'),
    formValues,
    errors,
    errorList: errorListFromErrors(errors)
  }
}

function bundlePath(bundleId, page) {
  return `${ROOT_PATH}/bundles/${encodeURIComponent(bundleId)}/${page}`
}

function defaultFormValues() {
  return {
    genetic_dam_tag: ''
  }
}

function formValuesFromPayload(payload = {}) {
  return {
    genetic_dam_tag: (payload.genetic_dam_tag ?? '').trim()
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
