import {
  homeController
} from './controllers/home-controller.js'
import {
  calfController,
  calfSubmitController
} from './controllers/calf-controller.js'
import {
  damController,
  damSubmitController
} from './controllers/dam-controller.js'
import {
  sireController,
  sireSubmitController
} from './controllers/sire-controller.js'
import {
  summaryController,
  summarySubmitController
} from './controllers/summary-controller.js'
import {
  resultController
} from './controllers/result-controller.js'

export const registerRoutes = (options = {}) => {
  const {rootPath = '/cattle-register', userService} = options
  return [
    {
      method: 'GET',
      path: `${rootPath}/home`,
      options: sessionAuth,
      ...homeController(userService)
    },
    ...calfRoutes(rootPath, userService),
    ...damRoutes(rootPath, userService),
    ...sireRoutes(rootPath, userService),
    ...summaryRoutes(rootPath, userService),
    ...resultRoutes(rootPath, userService),
  ]
}

function calfRoutes(path, options) {
  return [
    {
      method: 'GET',
      path: `${rootPath}/calf`,
      ...calfController
    },
    {
      method: 'POST',
      path: `${rootPath}/calf`,
      options: {
        ...calfSubmitController.options
      },
      handler: calfSubmitController.handler
    }
  ]
}

function damRoutes(path, options) {
  return [
    {
      method: 'GET',
      path: `${rootPath}/dam`,
      ...damController
    },
    {
      method: 'POST',
      path: `${rootPath}/dam`,
      options: {
        ...damSubmitController.options
      },
      handler: damSubmitController.handler
    }
  ]
}

function sireRoutes(path, options) {
  return [
    {
      method: 'GET',
      path: `${rootPath}/sire`,
      ...sireController
    },
    {
      method: 'POST',
      path: `${rootPath}/sire`,
      options: {
        ...sireSubmitController.options
      },
      handler: sireSubmitController.handler
    }
  ]
}

function summaryRoutes(path, options) {
  return [
    {
      method: 'GET',
      path: `${rootPath}/summary`,
      ...summaryController
    },
    {
      method: 'POST',
      path: `${rootPath}/summary`,
      options: {
        ...summarySubmitController.options
      },
      handler: summarySubmitController.handler
    }
  ]
}

function resultRoutes(path, options) {
  return [
    {
      method: 'GET',
      path: `${rootPath}/result`,
      ...resultController
    }
  ]
}
