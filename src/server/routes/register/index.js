import Boom from '@hapi/boom'
import Joi from 'joi'

import { REGISTER_ROUTE } from './paths.js'
import { MAX_FIELD_LENGTH } from './form-limits.js'
import { demandRegisterAccess } from './holding-access.js'
import {
  demandCalfComplete,
  demandDamComplete,
  demandDamType,
  loadCalf,
  loadRegistration
} from './registration.js'
import { returnQuery } from './check-return.js'
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
  tagListController,
  tagListSubmitController
} from './tag-list/controller.js'

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

// The first calf's calf details also has an address without a calf number,
// where a registration starts.
const firstCalfDetailsParams = {
  params: Joi.object({
    cph,
    registrationId: Joi.string().guid().required(),
    calfNumber: Joi.forbidden().default(1)
  }),
  failAction: failValidation,
  query: returnQuery
}

const calfParams = {
  params: Joi.object({
    cph,
    registrationId: Joi.string().guid().required(),
    calfNumber: Joi.string()
      .pattern(/^[1-9]\d{0,2}$/)
      .required()
      .custom(Number)
  }),
  failAction: failValidation
}

const changeableCalfParams = {
  ...calfParams,
  query: returnQuery
}

const calfPrerequisites = [
  { method: demandRegisterAccess },
  { method: loadCalf, assign: 'calf' }
]

const geneticDamPrerequisites = [
  ...calfPrerequisites,
  { method: demandDamType('genetic') }
]

const surrogateDamPrerequisites = [
  ...calfPrerequisites,
  { method: demandDamType('surrogate') }
]

const formField = Joi.string().max(MAX_FIELD_LENGTH).allow('').default('')

const calfDetailsPayload = Joi.object({
  earTagNumber: formField,
  dateOfBirth: formField,
  sex: formField,
  breed: formField,
  acknowledgedLateDateOfBirth: formField
}).options({ stripUnknown: true })

const calfDetailsRoutes = [
  [`${REGISTER_ROUTE}/{registrationId}/calf-details`, firstCalfDetailsParams],
  [
    `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/calf-details`,
    changeableCalfParams
  ]
].flatMap(([path, validate]) => [
  {
    method: 'GET',
    path,
    ...calfDetailsController,
    options: { validate, pre: [{ method: demandRegisterAccess }] }
  },
  {
    method: 'POST',
    path,
    ...calfDetailsSubmitController,
    options: {
      validate: { ...validate, payload: calfDetailsPayload },
      pre: [{ method: demandRegisterAccess }]
    }
  }
])

const damDetailsPayload = Joi.object({
  damType: formField
}).options({ stripUnknown: true })

const geneticDamPayload = Joi.object({
  earTagNumber: formField
}).options({ stripUnknown: true })

const geneticDamRoutes = [
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/genetic-dam`,
    ...geneticDamController,
    options: {
      validate: changeableCalfParams,
      pre: geneticDamPrerequisites
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/genetic-dam`,
    ...geneticDamSubmitController,
    options: {
      validate: {
        ...changeableCalfParams,
        payload: geneticDamPayload
      },
      pre: geneticDamPrerequisites
    }
  }
]

const surrogateDamPayload = Joi.object({
  geneticDamEarTagNumber: formField,
  surrogateDamEarTagNumber: formField
}).options({ stripUnknown: true })

const surrogateDamRoutes = [
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/surrogate-dam`,
    ...surrogateDamController,
    options: {
      validate: changeableCalfParams,
      pre: surrogateDamPrerequisites
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/surrogate-dam`,
    ...surrogateDamSubmitController,
    options: {
      validate: {
        ...changeableCalfParams,
        payload: surrogateDamPayload
      },
      pre: surrogateDamPrerequisites
    }
  }
]

const sireDetailsPrerequisites = [
  ...calfPrerequisites,
  { method: demandDamComplete }
]

const sireDetailsPayload = Joi.object({
  sireEarTagNumber: formField,
  sireName: formField
}).options({ stripUnknown: true })

const sireDetailsRoutes = [
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/sire-details`,
    ...sireDetailsController,
    options: {
      validate: changeableCalfParams,
      pre: sireDetailsPrerequisites
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/sire-details`,
    ...sireDetailsSubmitController,
    options: {
      validate: {
        ...changeableCalfParams,
        payload: sireDetailsPayload
      },
      pre: sireDetailsPrerequisites
    }
  }
]

const checkCalfDetailsPrerequisites = [
  ...calfPrerequisites,
  { method: demandCalfComplete }
]

const checkCalfDetailsRoutes = [
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/check-calf-details`,
    ...checkCalfDetailsController,
    options: {
      validate: calfParams,
      pre: checkCalfDetailsPrerequisites
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/check-calf-details`,
    ...checkCalfDetailsSubmitController,
    options: {
      validate: calfParams,
      pre: checkCalfDetailsPrerequisites
    }
  }
]

const tagListPrerequisites = [
  { method: demandRegisterAccess },
  { method: loadRegistration, assign: 'registration' }
]

const tagListPayload = Joi.object({
  addAnother: formField
}).options({ stripUnknown: true })

const tagListRoutes = [
  {
    method: 'GET',
    path: `${REGISTER_ROUTE}/{registrationId}/tag-list`,
    ...tagListController,
    options: {
      validate: registrationParams,
      pre: tagListPrerequisites
    }
  },
  {
    method: 'POST',
    path: `${REGISTER_ROUTE}/{registrationId}/tag-list`,
    ...tagListSubmitController,
    options: {
      validate: { ...registrationParams, payload: tagListPayload },
      pre: tagListPrerequisites
    }
  }
]

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
        ...calfDetailsRoutes,
        {
          method: 'GET',
          path: `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/dam-details`,
          ...damDetailsController,
          options: {
            validate: changeableCalfParams,
            pre: calfPrerequisites
          }
        },
        {
          method: 'POST',
          path: `${REGISTER_ROUTE}/{registrationId}/calves/{calfNumber}/dam-details`,
          ...damDetailsSubmitController,
          options: {
            validate: {
              ...changeableCalfParams,
              payload: damDetailsPayload
            },
            pre: calfPrerequisites
          }
        },
        ...geneticDamRoutes,
        ...surrogateDamRoutes,
        ...sireDetailsRoutes,
        ...checkCalfDetailsRoutes,
        ...tagListRoutes
      ])
    }
  }
}
