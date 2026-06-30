import Joi from 'joi'
import { buildMicrositePath } from '@livestock/ui-services'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { taxonomy } from '@livestock/taxonomy-register'
import { comboBreeds, species } from '@livestock/species-cattle'

const TEMPLATE = 'calf.njk'
const PAGE_TITLE = 'Calf details'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const calfController = {
  handler(_request, h) {
    return h.view(TEMPLATE, viewModel())
  }
}

export const calfSubmitController = {
  options: {
    validate: {
      payload: Joi.object({
        tag: Joi.string().trim().min(1).required(),
        'dob-day': Joi.string().trim().min(1).required(),
        'dob-month': Joi.string().trim().min(1).required(),
        'dob-year': Joi.string().trim().min(1).required(),
        sex: Joi.string().trim().valid('male', 'female').required(),
        breed: Joi.string().trim().min(1).required()
      }),
      failAction(request, h, err) {
        const formValues = formValuesFromPayload(request.payload)
        const errors = errorsFromValidation(err)

        return h
          .view(TEMPLATE, viewModel({ formValues, errors }))
          .code(statusCodes.badRequest)
          .takeover()
      }
    }
  },
  handler(_request, h) {
    return h.redirect(`${ROOT_PATH}/dam`)
  }
}

function errorsFromValidation(validationError) {
  const errors = {}
  const details =
    validationError?.details ?? validationError?.data?.details ?? []

  for (const detail of details) {
    switch (detail?.path?.[0]) {
      case 'tag':
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
        errors.breed = 'Select the calf breed'
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
    breeds: breedsWithSelection(formValues.breed),
    postBackUrl: `${ROOT_PATH}/basic`,
    formValues,
    errors,
    errorList: errorListFromErrors(errors)
  }
}

function defaultFormValues() {
  return {
    tag: '',
    'dob-day': '',
    'dob-month': '',
    'dob-year': '',
    sex: '',
    breed: ''
  }
}

function formValuesFromPayload(payload = {}) {
  return {
    tag: (payload.tag ?? '').trim(),
    'dob-day': (payload['dob-day'] ?? '').trim(),
    'dob-month': (payload['dob-month'] ?? '').trim(),
    'dob-year': (payload['dob-year'] ?? '').trim(),
    sex: (payload.sex ?? '').trim(),
    breed: (payload.breed ?? '').trim()
  }
}

function breedsWithSelection(selectedBreed) {
  return comboBreeds.map((breed) => ({
    ...breed,
    selected: breed.value === selectedBreed
  }))
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
