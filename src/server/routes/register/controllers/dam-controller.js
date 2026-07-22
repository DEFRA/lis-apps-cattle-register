import Joi from 'joi'
import { buildMicrositePath } from '@livestock/ui-services'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

const TEMPLATE = './register/dam.njk'
const PAGE_TITLE = 'Dam details'
const TAG_HEADING = 'Official animal ear tag number: '
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const damController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel({ bundleId: request.params.bundleId }))
  }
}

export const damSubmitController = {
  options: {
    validate: {
      payload: Joi.object({
        dam_type: Joi.string().trim().valid('genetic', 'surrogate').required()
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
    return h.redirect(
      bundlePath(request.params.bundleId, `${request.payload.dam_type}-dam`)
    )
  }
}

function errorsFromValidation(validationError) {
  const errors = {}
  const details =
    validationError?.details ?? validationError?.data?.details ?? []

  for (const detail of details) {
    if (detail?.path?.[0] === 'dam_type') {
      errors.dam_type = 'Select the type of the dam'
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
    tagHeading: `${TAG_HEADING}UK2134`,
    postBackUrl: bundlePath(overrides.bundleId, 'dam'),
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
    dam_type: ''
  }
}

function formValuesFromPayload(payload = {}) {
  return {
    dam_type: (payload.dam_type ?? '').trim()
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
