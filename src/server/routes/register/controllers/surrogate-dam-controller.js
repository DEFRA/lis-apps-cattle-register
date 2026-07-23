import Joi from 'joi'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { bundlePath, cphFromParams } from '../paths.js'

const TEMPLATE = './register/surrogate-dam.njk'
const PAGE_TITLE = 'Surrogate Dam details'

export const surrogateDamController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel(requestContext(request)))
  }
}

export const surrogateDamSubmitController = {
  options: {
    validate: {
      payload: Joi.object({
        genetic_dam_tag: Joi.string().trim().min(1).required(),
        surrogate_tag: Joi.string().trim().min(1).required()
      }),
      failAction(request, h, err) {
        const formValues = formValuesFromPayload(request.payload)
        const errors = errorsFromValidation(err)

        return h
          .view(
            TEMPLATE,
            viewModel({ ...requestContext(request), formValues, errors })
          )
          .code(statusCodes.badRequest)
          .takeover()
      }
    }
  },
  handler(request, h) {
    return h.redirect(
      bundlePath(request.app.cph, request.params.bundleId, 'sire')
    )
  }
}

function errorsFromValidation(validationError) {
  const errors = {}
  const details =
    validationError?.details ?? validationError?.data?.details ?? []

  for (const detail of details) {
    switch (detail?.path?.[0]) {
      case 'genetic_dam_tag':
        errors.genetic_dam_tag = 'Enter the animal ear tag number'
        break
      case 'surrogate_tag':
        errors.surrogate_tag = 'Enter the animal ear tag number'
        break
      default:
        break
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
    backUrl: bundlePath(overrides.cph, overrides.bundleId, 'dam'),
    postBackUrl: bundlePath(overrides.cph, overrides.bundleId, 'surrogate-dam'),
    formValues,
    errors,
    errorList: errorListFromErrors(errors)
  }
}

function requestContext(request) {
  return {
    cph: request.app.cph ?? cphFromParams(request.params),
    bundleId: request.params.bundleId
  }
}

function defaultFormValues() {
  return {
    genetic_dam_tag: '',
    surrogate_tag: ''
  }
}

function formValuesFromPayload(payload = {}) {
  return {
    genetic_dam_tag: (payload.genetic_dam_tag ?? '').trim(),
    surrogate_tag: (payload.surrogate_tag ?? '').trim()
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
