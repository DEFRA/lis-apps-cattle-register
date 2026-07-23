import { config } from '#config/config.js'
import { statusCodes } from '@livestock/ui-services/status-codes'
import {
  createBundleForUser,
  getBundleForUser,
  isBackOffice,
  listBundlesForUser
} from '../bundle-store.js'
import {
  bundlePath,
  bundleRoot,
  bundlesRoot,
  cphFromParams,
  holdingRoot
} from '../paths.js'

const LANDING_TEMPLATE = './register/landing.njk'
const SUMMARY_TEMPLATE = './register/bundle-summary.njk'

export const bundleLandingController = {
  handler(request, h) {
    const cph = cphFromParams(request.params)
    const allBundles = listBundlesForUser(
      request.app.hubAuth,
      config.get('bundleHistoryMonths')
    )
    const bundles = cph
      ? allBundles.filter((bundle) => bundle.cph === cph)
      : allBundles
    const selectedCph = cph ?? bundles[0]?.cph

    return h.view(LANDING_TEMPLATE, {
      pageTitle: 'Cattle registrations',
      heading: 'Cattle registrations',
      startUrl: selectedCph ? bundlesRoot(selectedCph) : null,
      historyMonths: config.get('bundleHistoryMonths'),
      showCph: isBackOffice(request.app.hubAuth),
      rows: bundles.map(toLandingRow)
    })
  }
}

export const bundleCreateController = {
  handler(request, h) {
    const cph = cphFromParams(request.params)
    const bundle = createBundleForUser(request.app.hubAuth, cph)
    return h.redirect(bundlePath(bundle.cph, bundle.id, 'calf'))
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
      backUrl: holdingRoot(bundle.cph),
      addCalfUrl: bundlePath(bundle.cph, bundle.id, 'calf'),
      submitUrl: bundlePath(bundle.cph, bundle.id, 'submit')
    })
  }
}

function toLandingRow(bundle) {
  return {
    ...bundle,
    href: bundleRoot(bundle.cph, bundle.id),
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
