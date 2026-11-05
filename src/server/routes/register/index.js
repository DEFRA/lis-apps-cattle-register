import Boom from '@hapi/boom'
import Joi from 'joi'

import { REGISTER_ROUTE } from './paths.js'
import { demandRegisterAccess } from './holding-access.js'
import { startRegistrationController } from './start/controller.js'
import {
  calfDetailsController,
  calfDetailsSubmitController
} from './calf-details/controller.js'

const MAX_FIELD_LENGTH = 200

const cph = Joi.string()
  .pattern(/^\d{2}\/\d{3}\/\d{4}$/)
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

const registrationParams = {
  params: Joi.object({
    cph,
    registrationId: Joi.string().guid().required()
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

export const register = {
  plugin: {
    name: 'register',
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
        {
          method: 'GET',
          path: `${REGISTER_ROUTE}/{registrationId}/calf-details`,
          ...calfDetailsController,
          options: {
            validate: registrationParams,
            pre: [{ method: demandRegisterAccess }]
          }
        },
        {
          method: 'POST',
          path: `${REGISTER_ROUTE}/{registrationId}/calf-details`,
          ...calfDetailsSubmitController,
          options: {
            validate: {
              ...registrationParams,
              payload: calfDetailsPayload
            },
            pre: [{ method: demandRegisterAccess }]
          }
        }
      ])
    }
  }
}
