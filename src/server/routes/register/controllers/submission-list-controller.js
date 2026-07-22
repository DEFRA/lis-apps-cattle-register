import Joi from 'joi'
import { buildMicrositePath } from '@livestock/ui-services'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

const TEMPLATE = './register/submission-list.njk'
const PAGE_TITLE = 'Register new cattle births'
const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)

export const submissionListController = {
  handler(request, h) {
    return h.view(TEMPLATE, viewModel({}, request.params.bundleId))
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
          .view(TEMPLATE, viewModel(errors, _request.params.bundleId))
          .code(statusCodes.badRequest)
          .takeover()
      }
    }
  },
  handler(_request, h) {
    if (_request.payload.add_more === 'yes') {
      // save and reset
      return h.redirect(bundlePath(_request.params.bundleId, 'calf'))
    } else {
      return h.redirect(bundlePath(_request.params.bundleId, 'submit'))
    }
  }
}

function viewModel(errors, bundleId) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    rows: createSummaryItems(bundleId),
    postBackUrl: bundlePath(bundleId, 'submission-list'),
    errors: errors ?? {},
    errorList: errorListFromErrors(errors ?? {})
  }
}

function createSummaryItems(bundleId) {
  return [
    createSummaryItem('UK123123', bundleId),
    createSummaryItem('UK123124', bundleId),
    createSummaryItem('UK123125', bundleId)
  ]
}

function createSummaryItem(tagRef, bundleId) {
  const anchor =
    `<form class="form" id="form${tagRef}" action="${bundlePath(bundleId, 'check')}" method="get"><input type="hidden" name="tagRef" value="${tagRef}">` +
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

function bundlePath(bundleId, page) {
  return `${ROOT_PATH}/bundles/${encodeURIComponent(bundleId)}/${page}`
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
