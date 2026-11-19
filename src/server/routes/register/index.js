import Boom from '@hapi/boom'
import Joi from 'joi'

import { REGISTER_ROUTE } from './paths.js'
import { echoed } from './form-limits.js'
import { demandRegisterAccess } from './holding-access.js'
import { redirectOnSaveConflict } from './save-conflict.js'
import { startRegistrationController } from './start/controller.js'
import {
  calfDetailsController,
  calfDetailsSubmitController
} from './calf-details/controller.js'
import {
  damDetailsController,
  damDetailsSubmitController
} from './dam-details/controller.js'
import {
  geneticDamController,
  geneticDamSubmitController
} from './genetic-dam/controller.js'
import {
  surrogateDamController,
  surrogateDamSubmitController
} from './surrogate-dam/controller.js'
import {
  sireDetailsController,
  sireDetailsSubmitController
} from './sire-details/controller.js'
import {
  checkCalfDetailsController,
  checkCalfDetailsSubmitController
} from './check-calf-details/controller.js'
import {
  cancelCalfController,
  cancelCalfSubmitController
} from './cancel/controller.js'
import { confirmationController } from './confirmation/controller.js'
import {
  submitRegistrationController,
  submitRegistrationSubmitController
} from './submit/controller.js'
import {
  tagListController,
  tagListSubmitController
} from './tag-list/controller.js'

/** @import { Server } from '@hapi/hapi' */

const cph = Joi.string()
  .pattern(/^\d{2}\/\d{3}\/\d{4}$/)
  .required()

// The BE4FE's submission id: three groups of three Crockford base32
// characters, which it reads case-insensitively
const submissionId = Joi.string()
  .pattern(
    /^[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}$/i
  )
  .required()

/**
 * A malformed path parameter is a page that does not exist; a malformed
 * form post (a field sent twice) is a bad request.
 * @param {object} _request
 * @param {object} _h
 * @param {Error & { output?: object }} error
 * @returns {never}
 */
function failValidation(_request, _h, error) {
  if (error.output?.payload?.validation?.source === 'payload') {
    throw Boom.badRequest()
  }

  throw Boom.notFound()
}

const holdingParams = {
  params: Joi.object({ cph }),
  failAction: failValidation
}

const submissionParams = {
  params: Joi.object({ cph, submissionId }),
  failAction: failValidation
}

const calfParams = {
  params: Joi.object({
    cph,
    submissionId,
    // A calf's id is its ear tag number, as the BE4FE lists them: letters
    // and digits
    animalId: Joi.string()
      .pattern(/^[0-9A-Z]{1,20}$/i)
      .required()
  }),
  failAction: failValidation
}

// An answer too long to show again is taken as not given, so its page asks
// for it and nothing is looked up by it
const formField = Joi.string().allow('').default('').custom(echoed)

// An ear tag number, a breed, or an answer that may be left out, is kept
// whole, so its page can say it is too long rather than take it as not given
const wholeFormField = Joi.string().allow('').default('')

const calfDetailsPayload = Joi.object({
  earTagNumber: wholeFormField,
  dateOfBirth: formField,
  sex: formField,
  breed: wholeFormField,
  acknowledgedLateDateOfBirth: formField
}).options({ stripUnknown: true })

const damDetailsPayload = Joi.object({
  damType: formField
}).options({ stripUnknown: true })

const geneticDamPayload = Joi.object({
  geneticDamEarTagNumber: wholeFormField
}).options({ stripUnknown: true })

const surrogateDamPayload = Joi.object({
  geneticDamEarTagNumber: wholeFormField,
  surrogateDamEarTagNumber: wholeFormField
}).options({ stripUnknown: true })

const tagListPayload = Joi.object({
  addAnother: formField
}).options({ stripUnknown: true })

const sireDetailsPayload = Joi.object({
  sireEarTagNumber: wholeFormField,
  sireName: wholeFormField
}).options({ stripUnknown: true })

// A calf has no id until its details, and so its ear tag number, are saved
const newCalfRoutes = [
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/calf-details`,
    ...calfDetailsController,
    options: {
      validate: submissionParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/calf-details`,
    ...calfDetailsSubmitController,
    options: {
      validate: {
        ...submissionParams,
        payload: calfDetailsPayload
      },
      pre: [{ method: demandRegisterAccess }]
    }
  }
]

const routes = [
  {
    method: 'GET',
    path: REGISTER_ROUTE,
    ...startRegistrationController,
    options: {
      validate: holdingParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  ...newCalfRoutes,
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/calf-details`,
    ...calfDetailsController,
    options: {
      validate: calfParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/calf-details`,
    ...calfDetailsSubmitController,
    options: {
      validate: {
        ...calfParams,
        payload: calfDetailsPayload
      },
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/dam-details`,
    ...damDetailsController,
    options: {
      validate: calfParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/dam-details`,
    ...damDetailsSubmitController,
    options: {
      validate: {
        ...calfParams,
        payload: damDetailsPayload
      },
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/genetic-dam`,
    ...geneticDamController,
    options: {
      validate: calfParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/genetic-dam`,
    ...geneticDamSubmitController,
    options: {
      validate: {
        ...calfParams,
        payload: geneticDamPayload
      },
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/surrogate-dam`,
    ...surrogateDamController,
    options: {
      validate: calfParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/surrogate-dam`,
    ...surrogateDamSubmitController,
    options: {
      validate: {
        ...calfParams,
        payload: surrogateDamPayload
      },
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/sire-details`,
    ...sireDetailsController,
    options: {
      validate: calfParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/sire-details`,
    ...sireDetailsSubmitController,
    options: {
      validate: {
        ...calfParams,
        payload: sireDetailsPayload
      },
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/check-calf-details`,
    ...checkCalfDetailsController,
    options: {
      validate: calfParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/check-calf-details`,
    ...checkCalfDetailsSubmitController,
    options: {
      validate: calfParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/cancel`,
    ...cancelCalfController,
    options: {
      validate: calfParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{submissionId}/calves/{animalId}/cancel`,
    ...cancelCalfSubmitController,
    options: {
      validate: calfParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}/submit`,
    ...submitRegistrationController,
    options: {
      validate: submissionParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{submissionId}/submit`,
    ...submitRegistrationSubmitController,
    options: {
      validate: submissionParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}/confirmation`,
    ...confirmationController,
    options: {
      validate: submissionParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{submissionId}`,
    ...tagListController,
    options: {
      validate: submissionParams,
      pre: [{ method: demandRegisterAccess }]
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{submissionId}`,
    ...tagListSubmitController,
    options: {
      validate: {
        ...submissionParams,
        payload: tagListPayload
      },
      pre: [{ method: demandRegisterAccess }]
    }
  }
]

export const register = {
  plugin: {
    name: 'register',
    /**
     * Registers the routes with the server.
     *
     * @param {Server} server - the Hapi server
     */
    register(server) {
      server.route(routes)
      // Its own routes only, and before the server's error pages
      server.ext('onPreResponse', redirectOnSaveConflict, {
        sandbox: 'plugin'
      })
    }
  }
}
