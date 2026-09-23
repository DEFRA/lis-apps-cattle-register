import Joi from 'joi'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { breeds, getBreedName } from '@defra/lis-species-cattle'
import { bundlePath, cphFromParams, holdingRoot } from '../paths.js'

const TEMPLATE = './register/calf.njk'
const PAGE_TITLE = 'Calf details'
const BREED_ITEMS = Object.entries(breeds).map(([value, text]) => ({
  value,
  text
}))

export const calfController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel(requestContext(request)))
  }
}

export const calfSubmitController = {
  options: {
    validate: {
      payload: Joi.object({
        calf_tag: Joi.string().trim().min(1).required(),
        'dob-day': Joi.string().trim().min(1).required(),
        'dob-month': Joi.string().trim().min(1).required(),
        'dob-year': Joi.string().trim().min(1).required(),
        sex: Joi.string().trim().valid('male', 'female').required(),
        breed: Joi.string()
          .trim()
          .min(1)
          .required()
          .custom((value, helpers) => {
            const code = value.toUpperCase()

            if (!getBreedName(code)) {
              return helpers.error('breed.unknown')
            }

            return code
          })
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
      bundlePath(request.app.cph, request.params.bundleId, 'dam')
    )
  }
}

function errorsFromValidation(validationError) {
  const errors = {}
  const details =
    validationError?.details ?? validationError?.data?.details ?? []

  for (const detail of details) {
    switch (detail?.path?.[0]) {
      case 'calf_tag':
        errors.tag = 'Enter the animal ear tag number'
        break
      case 'dob-day':
      case 'dob-month':
      case 'dob-year':
        errors.dob = 'Enter the calf date of birth'
        break
      case 'sex':
        errors.sex = 'Select the calf sex'
        break
      case 'breed':
        errors.breed = breedErrorMessage(detail)
        break
      default:
        break
    }
  }

  return errors
}

function breedErrorMessage(detail) {
  return detail?.type === 'breed.unknown'
    ? 'Select a breed from the list'
    : 'Select the calf breed'
}

function viewModel(overrides = {}) {
  const formValues = overrides.formValues ?? defaultFormValues()
  const errors = overrides.errors ?? {}

  return {
    pageTitle: withErrorPageTitle(PAGE_TITLE, errors),
    heading: PAGE_TITLE,
    backUrl: holdingRoot(overrides.cph),
    breeds: BREED_ITEMS,
    postBackUrl: bundlePath(overrides.cph, overrides.bundleId, 'calf'),
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
    calf_tag: '',
    'dob-day': '',
    'dob-month': '',
    'dob-year': '',
    sex: '',
    breed: ''
  }
}

function formValuesFromPayload(payload = {}) {
  return {
    calf_tag: (payload.calf_tag ?? '').trim(),
    'dob-day': (payload['dob-day'] ?? '').trim(),
    'dob-month': (payload['dob-month'] ?? '').trim(),
    'dob-year': (payload['dob-year'] ?? '').trim(),
    sex: (payload.sex ?? '').trim(),
    breed: (payload.breed ?? '').trim()
  }
}

function errorListFromErrors(errors) {
  return Object.entries(errors).map(([field, text]) => ({
    text,
    href: `#${field === 'dob' ? 'dob-day' : field}`
  }))
}

function withErrorPageTitle(title, errors = {}) {
  return Object.keys(errors).length ? `Error: ${title}` : title
}
