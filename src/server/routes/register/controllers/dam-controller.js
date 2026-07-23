import Joi from 'joi'
import { statusCodes } from '@livestock/ui-services/status-codes'

const TEMPLATE = './register/dam.njk'
const PAGE_TITLE = 'Dam details'
const TAG_HEADING = 'Official animal ear tag number: '
import { bundlePath, cphFromParams } from '../paths.js'

export const damController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel(requestContext(request)))
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
            viewModel({ ...requestContext(request), formValues, errors })
          )
          .code(statusCodes.badRequest)
          .takeover()
      }
    }
  },
  handler(request, h) {
    return h.redirect(
      bundlePath(
        request.app.cph,
        request.params.bundleId,
        `${request.payload.dam_type}-dam`
      )
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
    backUrl: bundlePath(overrides.cph, overrides.bundleId, 'calf'),
    tagHeading: `${TAG_HEADING}UK2134`,
    postBackUrl: bundlePath(overrides.cph, overrides.bundleId, 'dam'),
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
