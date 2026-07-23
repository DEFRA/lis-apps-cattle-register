import Joi from 'joi'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { bundlePath, cphFromParams } from '../paths.js'

const TEMPLATE = './register/submission-list.njk'
const PAGE_TITLE = 'Register new cattle births'

export const submissionListController = {
  handler(request, h) {
    return h.view(
      TEMPLATE,
      viewModel(
        {},
        request.app.cph,
        request.params.bundleId,
        request.app.bundle
      )
    )
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
          .view(
            TEMPLATE,
            viewModel(
              errors,
              _request.app.cph ?? cphFromParams(_request.params),
              _request.params.bundleId,
              _request.app.bundle
            )
          )
          .code(statusCodes.badRequest)
          .takeover()
      }
    }
  },
  handler(_request, h) {
    if (_request.payload.add_more === 'yes') {
      // save and reset
      return h.redirect(
        bundlePath(_request.app.cph, _request.params.bundleId, 'calf')
      )
    } else {
      return h.redirect(
        bundlePath(_request.app.cph, _request.params.bundleId, 'submit')
      )
    }
  }
}

function viewModel(errors, cph, bundleId, bundle) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    rows: createSummaryItems(cph, bundleId, bundle?.calves),
    postBackUrl: bundlePath(cph, bundleId, 'submission-list'),
    errors: errors ?? {},
    errorList: errorListFromErrors(errors ?? {})
  }
}

function createSummaryItems(cph, bundleId, calves = []) {
  return calves.map((calf) => createSummaryItem(calf, cph, bundleId))
}

function createSummaryItem(calf, cph, bundleId) {
  const calfId = calf.id ?? calf.tag
  const tagRef = calf.tag
  const checkPath = `calves/${encodeURIComponent(calfId)}/check`
  const anchor = `<a href="${bundlePath(cph, bundleId, checkPath)}">${tagRef}</a>`

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
