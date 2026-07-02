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

import { confirmationController } from './controllers/confirmation-controller.js'

export const routes = (options = {}) => {
  const { rootPath = '/' } = options

  return [
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
      path: routePath(rootPath),
      ...calfController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'calf'),
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
      path: routePath(rootPath, 'dam'),
      ...damController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'dam'),
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
      path: routePath(rootPath, 'genetic-dam'),
      ...geneticDamController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'genetic-dam'),
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
      path: routePath(rootPath, 'surrogate-dam'),
      ...surrogateDamController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'surrogate-dam'),
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
      path: routePath(rootPath, 'sire'),
      ...sireController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'sire'),
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
      path: routePath(rootPath, 'check'),
      ...checkController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'check'),
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
      path: routePath(rootPath, 'submission-list'),
      ...submissionListController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'submission-list'),
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
      path: routePath(rootPath, 'submit'),
      ...submitController
    },
    {
      method: 'POST',
      path: routePath(rootPath, 'submit'),
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
      path: routePath(rootPath, 'confirmation'),
      ...confirmationController
    }
  ]
}
