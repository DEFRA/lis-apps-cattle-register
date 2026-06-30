import Joi from 'joi'
import { buildMicrositePath } from '@livestock/ui-services'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { taxonomy } from '@livestock/taxonomy-register'
import { comboBreeds, species } from '@livestock/species-cattle'

const TEMPLATE = 'dam.njk'
const PAGE_TITLE = 'Dam details'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const damController = {
  handler(_request, h) {
    return h.view(TEMPLATE, viewModel())
  }
}

export const damSubmitController = {
  options: {
    validate: {
      payload: Joi.object({
        transfer: Joi.string().trim().valid('yes', 'no').required(),
        embrio: Joi.string().trim().allow('').when('transfer', {
          is: 'yes',
          then: Joi.string().trim().min(1).required()
        }),
        genetic_dam: Joi.string().trim().min(1).required(),
        dam_breed: Joi.string().trim().min(1).required(),
        assistance: Joi.string().trim().min(1).required()
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
    return h.redirect(`${ROOT_PATH}/sire`)
  }
}

function errorsFromValidation(validationError) {
  const errors = {}
  const details =
    validationError?.details ?? validationError?.data?.details ?? []

  for (const detail of details) {
    switch (detail?.path?.[0]) {
      case 'transfer':
        errors.transfer =
          'Select whether the calf was born from an embryo transfer'
        break
      case 'embrio':
        errors.embrio = 'Enter the surrogate dam tag number'
        break
      case 'genetic_dam':
        errors.genetic_dam = 'Enter the genetic dam tag number'
        break
      case 'dam_breed':
        errors.dam_breed = 'Select the dam breed'
        break
      case 'assistance':
        errors.assistance = 'Select the level of assistance used'
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
    breeds: breedsWithSelection(formValues.dam_breed),
    postBackUrl: `${ROOT_PATH}/dam`,
    formValues,
    errors,
    errorList: errorListFromErrors(errors)
  }
}

function defaultFormValues() {
  return {
    transfer: '',
    embrio: '',
    genetic_dam: '',
    dam_breed: '',
    assistance: ''
  }
}

function formValuesFromPayload(payload = {}) {
  return {
    transfer: (payload.transfer ?? '').trim(),
    embrio: (payload.embrio ?? '').trim(),
    genetic_dam: (payload.genetic_dam ?? '').trim(),
    dam_breed: (payload.dam_breed ?? '').trim(),
    assistance: (payload.assistance ?? '').trim()
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
    href: `#${field}`
  }))
}

function withErrorPageTitle(title, errors = {}) {
  return Object.keys(errors).length ? `Error: ${title}` : title
}
