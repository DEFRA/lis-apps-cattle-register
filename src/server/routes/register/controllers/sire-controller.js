import Joi from 'joi'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { bundlePath, cphFromParams } from '../paths.js'

const TEMPLATE = './register/sire.njk'
const PAGE_TITLE = 'Sire details'

export const sireController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel(requestContext(request)))
  }
}

export const sireSubmitController = {
  options: {
    validate: {
      payload: Joi.object({
        sire_tag: Joi.string().trim().allow(''),
        sire_name: Joi.string().trim().allow('')
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
      bundlePath(request.app.cph, request.params.bundleId, 'check')
    )
  }
}

function errorsFromValidation(validationError) {
  const errors = {}
  const details =
    validationError?.details ?? validationError?.data?.details ?? []

  for (const detail of details) {
    switch (detail?.path?.[0]) {
      case 'sire_tag':
        errors.sire_tag = 'Enter the sire ear tag number as text'
        break
      case 'sire_name':
        errors.sire_name = 'Enter the sire name as text'
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
    postBackUrl: bundlePath(overrides.cph, overrides.bundleId, 'sire'),
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
    sire_tag: '',
    sire_name: ''
  }
}

function formValuesFromPayload(payload = {}) {
  return {
    sire_tag: (payload.sire_tag ?? '').trim(),
    sire_name: (payload.sire_name ?? '').trim()
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
