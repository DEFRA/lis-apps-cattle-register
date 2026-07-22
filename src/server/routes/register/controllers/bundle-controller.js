import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'
import { config } from '#config/config.js'
import { statusCodes } from '@livestock/ui-services/status-codes'
import {
  createBundleForUser,
  getBundleForUser,
  listBundlesForUser
} from '../bundle-store.js'

const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)
const LANDING_TEMPLATE = './register/landing.njk'
const SUMMARY_TEMPLATE = './register/bundle-summary.njk'

export const bundleLandingController = {
  handler(request, h) {
    const bundles = listBundlesForUser(
      request.app.hubAuth,
      config.get('bundleHistoryMonths')
    )

    return h.view(LANDING_TEMPLATE, {
      pageTitle: 'Cattle registrations',
      heading: 'Cattle registrations',
      startUrl: `${ROOT_PATH}/bundles`,
      historyMonths: config.get('bundleHistoryMonths'),
      showCph: request.app.hubAuth?.permissions?.includes(
        'lis-perm-back-office'
      ),
      rows: bundles.map(toLandingRow)
    })
  }
}

export const bundleCreateController = {
  handler(request, h) {
    const bundle = createBundleForUser(request.app.hubAuth)
    return h.redirect(`${ROOT_PATH}/bundles/${bundle.id}/calf`)
  }
}

export const bundleSummaryController = {
  handler(request, h) {
    const bundle = getBundleForUser(
      request.params.bundleId,
      request.app.hubAuth
    )

    if (!bundle) {
      return h.response('Registration not found').code(statusCodes.notFound)
    }

    const isDraft = bundle.status === 'draft'
    return h.view(SUMMARY_TEMPLATE, {
      pageTitle: 'Registration summary',
      heading: 'Registration summary',
      bundle,
      statusText: statusText(bundle.status),
      eventLabel: eventLabel(bundle.status),
      eventDate: formatDate(
        bundle.submittedAt ?? bundle.abandonedAt ?? bundle.updatedAt
      ),
      isDraft,
      backUrl: ROOT_PATH,
      addCalfUrl: `${ROOT_PATH}/bundles/${bundle.id}/calf`,
      submitUrl: `${ROOT_PATH}/bundles/${bundle.id}/submit`
    })
  }
}

function toLandingRow(bundle) {
  return {
    ...bundle,
    href: `${ROOT_PATH}/bundles/${bundle.id}`,
    statusText: statusText(bundle.status),
    statusClass: {
      draft: 'govuk-tag--blue',
      submitted: 'govuk-tag--green',
      abandoned: 'govuk-tag--grey'
    }[bundle.status],
    animalCount: bundle.calves.length,
    activityDate: formatDate(bundle.updatedAt)
  }
}

function statusText(status) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function eventLabel(status) {
  return {
    submitted: 'Date submitted',
    abandoned: 'Date abandoned',
    draft: 'Last updated'
  }[status]
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(value))
}
