import {
  calfController,
  calfSubmitController
} from './controllers/calf-controller.js'
import {
  damController,
  damSubmitController
} from './controllers/dam-controller.js'
import {
  geneticDamController,
  geneticDamSubmitController
} from './controllers/genetic-dam-controller.js'
import {
  surrogateDamController,
  surrogateDamSubmitController
} from './controllers/surrogate-dam-controller.js'
import {
  sireController,
  sireSubmitController
} from './controllers/sire-controller.js'
import {
  checkController,
  checkSubmitController
} from './controllers/check-controller.js'
import {
  submissionListController,
  submissionListSubmitController
} from './controllers/submission-list-controller.js'
import {
  submitController,
  submitSubmitController
} from './controllers/submit-controller.js'

/** @import { ServerRoute } from '@hapi/hapi' */
import { confirmationController } from './controllers/confirmation-controller.js'
import {
  bundleCreateController,
  bundleLandingController,
  bundleSummaryController
} from './controllers/bundle-controller.js'

/**
 * @param {{ rootPath?: string }} [options]
 * @returns {ServerRoute[]}
 */
export const routes = (options = {}) => {
  const { rootPath = '/' } = options

  return [
    ...bundleRoutes(rootPath),
    ...calfRoutes(rootPath),
    ...damRoutes(rootPath),
    ...geneticDamRoutes(rootPath),
    ...surrogateDamRoutes(rootPath),
    ...sireRoutes(rootPath),
    ...checkRoutes(rootPath),
    ...submissionListRoutes(rootPath),
    ...submitRoutes(rootPath),
    ...confirmationRoutes(rootPath)
  ]
}

function bundleRoutes(rootPath) {
  return [
    { method: 'GET', path: routePath(rootPath), ...bundleLandingController },
    {
      method: 'POST',
      path: routePath(rootPath, 'bundles'),
      ...bundleCreateController
    },
    {
      method: 'GET',
      path: routePath(rootPath, 'bundles/{bundleId}'),
      ...bundleSummaryController
    }
  ]
}

function routePath(rootPath, childPath = '') {
  const normalizedRootPath = rootPath === '/' ? '' : rootPath.replace(/\/$/, '')

  if (!childPath) {
    return normalizedRootPath || '/'
  }

  return `${normalizedRootPath}/${childPath}`
}

function calfRoutes(rootPath) {
  return [
    {
      method: 'GET',
      path: routePath(rootPath, 'bundles/{bundleId}/calf'),
      ...calfController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'bundles/{bundleId}/calf'),
      options: {
        ...calfSubmitController.options
      },
      handler: calfSubmitController.handler
    }
  ]
}

function damRoutes(rootPath) {
  return [
    {
      method: 'GET',
      path: routePath(rootPath, 'bundles/{bundleId}/dam'),
      ...damController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'bundles/{bundleId}/dam'),
      options: {
        ...damSubmitController.options
      },
      handler: damSubmitController.handler
    }
  ]
}

function geneticDamRoutes(rootPath) {
  return [
    {
      method: 'GET',
      path: routePath(rootPath, 'bundles/{bundleId}/genetic-dam'),
      ...geneticDamController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'bundles/{bundleId}/genetic-dam'),
      options: {
        ...geneticDamSubmitController.options
      },
      handler: geneticDamSubmitController.handler
    }
  ]
}

function surrogateDamRoutes(rootPath) {
  return [
    {
      method: 'GET',
      path: routePath(rootPath, 'bundles/{bundleId}/surrogate-dam'),
      ...surrogateDamController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'bundles/{bundleId}/surrogate-dam'),
      options: {
        ...surrogateDamSubmitController.options
      },
      handler: surrogateDamSubmitController.handler
    }
  ]
}

function sireRoutes(rootPath) {
  return [
    {
      method: 'GET',
      path: routePath(rootPath, 'bundles/{bundleId}/sire'),
      ...sireController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'bundles/{bundleId}/sire'),
      options: {
        ...sireSubmitController.options
      },
      handler: sireSubmitController.handler
    }
  ]
}

function checkRoutes(rootPath) {
  return [
    {
      method: 'GET',
      path: routePath(rootPath, 'bundles/{bundleId}/check'),
      ...checkController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'bundles/{bundleId}/check'),
      options: {
        ...checkSubmitController.options
      },
      handler: checkSubmitController.handler
    }
  ]
}

function submissionListRoutes(rootPath) {
  return [
    {
      method: 'GET',
      path: routePath(rootPath, 'bundles/{bundleId}/submission-list'),
      ...submissionListController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'bundles/{bundleId}/submission-list'),
      options: {
        ...submissionListSubmitController.options
      },
      handler: submissionListSubmitController.handler
    }
  ]
}

function submitRoutes(rootPath) {
  return [
    {
      method: 'GET',
      path: routePath(rootPath, 'bundles/{bundleId}/submit'),
      ...submitController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'bundles/{bundleId}/submit'),
      options: {
        ...submitSubmitController.options
      },
      handler: submitSubmitController.handler
    }
  ]
}

function confirmationRoutes(rootPath) {
  return [
    {
      method: 'GET',
      path: routePath(rootPath, 'bundles/{bundleId}/confirmation'),
      ...confirmationController
    }
  ]
}
