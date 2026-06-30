import Joi from 'joi'
import { buildMicrositePath } from '@livestock/ui-services'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

const TEMPLATE = 'sire.njk'
const PAGE_TITLE = 'Sire details'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const sireController = {
  handler(_request, h) {
    return h.view(TEMPLATE, viewModel())
  }
}

export const sireSubmitController = {
  options: {
    validate: {
      payload: Joi.object({
        identifySire: Joi.string()
          .trim()
          .valid('uniqueTag', 'aiRef', 'pedigree', 'none')
          .required(),
        uniqueTag: Joi.string().trim().allow('').when('identifySire', {
          is: 'uniqueTag',
          then: Joi.string().trim().min(1).required()
        }),
        aiRef: Joi.string().trim().allow('').when('identifySire', {
          is: 'aiRef',
          then: Joi.string().trim().min(1).required()
        }),
        pedigreeRef: Joi.string().trim().allow('').when('identifySire', {
          is: 'pedigree',
          then: Joi.string().trim().min(1).required()
        })
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
    return h.redirect(`${ROOT_PATH}/summary`)
  }
}

function errorsFromValidation(validationError) {
  const errors = {}
  const details =
    validationError?.details ?? validationError?.data?.details ?? []

  for (const detail of details) {
    switch (detail?.path?.[0]) {
      case 'identifySire':
        errors.identifySire = 'Select how you can identify the sire'
        break
      case 'uniqueTag':
        errors.uniqueTag = 'Enter the unique tag number'
        break
      case 'aiRef':
        errors.aiRef = 'Enter the AI reference number'
        break
      case 'pedigreeRef':
        errors.pedigreeRef = 'Enter the pedigree information'
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
    postBackUrl: `${ROOT_PATH}/sire`,
    formValues,
    errors,
    errorList: errorListFromErrors(errors)
  }
}

function defaultFormValues() {
  return {
    identifySire: '',
    uniqueTag: '',
    aiRef: '',
    pedigreeRef: ''
  }
}

function formValuesFromPayload(payload = {}) {
  return {
    identifySire: (payload.identifySire ?? '').trim(),
    uniqueTag: (payload.uniqueTag ?? '').trim(),
    aiRef: (payload.aiRef ?? '').trim(),
    pedigreeRef: (payload.pedigreeRef ?? '').trim()
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
