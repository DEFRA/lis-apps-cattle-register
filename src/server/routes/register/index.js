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

const formField = Joi.string().max(MAX_FIELD_LENGTH).allow('').default('')

const calfDetailsPayload = Joi.object({
  earTagNumber: formField,
  dateOfBirth: formField,
  sex: formField,
  breed: formField,
  acknowledgedLateDateOfBirth: formField
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

export const register = {
  plugin: {
    name: 'register',
    /**
     * Registers the routes with the server.
     *
     * @param {Server} server - the Hapi server
     */
    register(server) {
      server.route([
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
        }
      ])
    }
  }
}
