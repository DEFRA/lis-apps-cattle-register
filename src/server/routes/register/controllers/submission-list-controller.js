import Joi from 'joi'
import { buildMicrositePath } from '@livestock/ui-services'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

const TEMPLATE = './register/submission-list.njk'
const PAGE_TITLE = 'Register new cattle births'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const submissionListController = {
  handler(_request, h) {
    return h.view(TEMPLATE, viewModel())
  }
}

export const submissionListSubmitController = {
  options: {
    validate: {
      payload: Joi.object({
        add_more: Joi.string().trim().valid('yes', 'no').required()
      }),
      failAction(_request, h, err) {
        const errors = errorsFromValidation(err)

        return h
          .view(TEMPLATE, viewModel(errors))
          .code(statusCodes.badRequest)
          .takeover()
      }
    }
  },
  handler(_request, h) {
    console.log(_request.payload)
    if (_request.payload.add_more === 'yes') {
      // save and reset
      return h.redirect(`${ROOT_PATH}/calf`)
    } else {
      return h.redirect(`${ROOT_PATH}/submit`)
    }
  }
}

function viewModel(errors) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    rows: createSummaryItems(),
    postBackUrl: `${ROOT_PATH}/submission-list`,
    errors: errors ?? {},
    errorList: errorListFromErrors(errors ?? {})
  }
}

function createSummaryItems() {
  return [
    createSummaryItem('UK123123'),
    createSummaryItem('UK123124'),
    createSummaryItem('UK123125')
  ]
}

function createSummaryItem(tagRef) {
  const anchor =
    `<form class="form" id="form${tagRef}" action="${ROOT_PATH}/summary" method="post"><input type="hidden" name="tagRef" value="${tagRef}">` +
    `<a href="#" onclick='document.getElementById("form${tagRef}").submit()'>${tagRef}</a>` +
    `</form>`

  return [
    {
      html: anchor
    },
    {
      html: '<strong class="govuk-tag govuk-tag--green">Ready to send</strong>',
      classes: 'govuk-table__header--numeric'
    }
  ]
}

function errorsFromValidation(validationError) {
  const errors = {}
  const details =
    validationError?.details ?? validationError?.data?.details ?? []

  for (const detail of details) {
    if (detail?.path?.[0] === 'add_more') {
      errors.add_more = 'Select yes to add additional animals or no to continue'
    }
  }

  return errors
}

function errorListFromErrors(errors) {
  return Object.entries(errors).map(([field, text]) => ({
    text,
    href: `#${field}`
  }))
}
