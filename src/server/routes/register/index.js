import Boom from '@hapi/boom'
import Joi from 'joi'

import { REGISTER_ROUTE } from './paths.js'
import { MAX_FIELD_LENGTH } from './form-limits.js'
import { demandRegisterAccess } from './holding-access.js'
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
 * form post (a field sent twice, or too long) is a bad request.
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

const calfParams = {
  params: Joi.object({
    cph,
    submissionId,
    animalId: Joi.string()
      .pattern(/^[1-9]\d{0,2}$/)
      .required()
  }),
  failAction: failValidation
}

const formField = Joi.string().max(MAX_FIELD_LENGTH).allow('').default('')

const calfDetailsPayload = Joi.object({
  earTagNumber: formField,
  dateOfBirth: formField,
  sex: formField,
  breed: formField,
  acknowledgedLateDateOfBirth: formField
}).options({ stripUnknown: true })

const damDetailsPayload = Joi.object({
  damType: formField
}).options({ stripUnknown: true })

const geneticDamPayload = Joi.object({
  geneticDamEarTagNumber: formField
}).options({ stripUnknown: true })

const surrogateDamPayload = Joi.object({
  geneticDamEarTagNumber: formField,
  surrogateDamEarTagNumber: formField
}).options({ stripUnknown: true })

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
  }
]

export const register = {
  plugin: {
    name: 'register',
    register(server) {
      server.route(routes)
    }
  }
}
