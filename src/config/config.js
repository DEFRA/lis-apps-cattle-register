import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import convictFormatWithValidator from 'convict-format-with-validator'

import { milliseconds } from '@livestock/ui-services/duration'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isDevelopment = process.env.NODE_ENV === 'development'

convict.addFormats(convictFormatWithValidator)

export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  basePath: {
    doc: 'Optional mount path for the application when it is hosted behind the hub.',
    format: String,
    default: '',
    env: 'BASE_PATH'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: milliseconds.oneWeek,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'Register for Cattle'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'Base asset path for direct application access',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: process.env.NODE_ENV !== 'test',
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'json', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : [],
      env: 'LOG_REDACT'
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  session: {
    cache: {
      engine: {
        doc: 'backend cache is written to',
        format: ['redis', 'memory'],
        default: isProduction ? 'redis' : 'memory',
        env: 'SESSION_CACHE_ENGINE'
      },
      name: {
        doc: 'server side session cache name',
        format: String,
        default: 'register-cattle-session',
        env: 'SESSION_CACHE_NAME'
      },
      ttl: {
        doc: 'server side session cache ttl',
        format: Number,
        default: milliseconds.fourHours,
        env: 'SESSION_CACHE_TTL'
      }
    },
    cookie: {
      ttl: {
        doc: 'Session cookie ttl',
        format: Number,
        default: milliseconds.fourHours,
        env: 'SESSION_COOKIE_TTL'
      },
      password: {
        doc: 'session cookie password',
        format: String,
        default: 'the-password-must-be-at-least-32-characters-long',
        env: 'SESSION_COOKIE_PASSWORD',
        sensitive: true
      },
      secure: {
        doc: 'set secure flag on cookie',
        format: Boolean,
        default: isProduction,
        env: 'SESSION_COOKIE_SECURE'
      }
    }
  },
  redis: {
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    },
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: 'register-cattle:',
      env: 'REDIS_KEY_PREFIX'
    },
    useSingleInstanceCache: {
      doc: 'Connect to a single instance of redis instead of a cluster.',
      format: Boolean,
      default: !isProduction,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    },
    useTLS: {
      doc: 'Connect to redis using TLS',
      format: Boolean,
      default: isProduction,
      env: 'REDIS_TLS'
    }
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  profileService: {
    url: {
      doc: 'Profile service endpoint used to enrich hub auth sessions',
      format: String,
      default: 'http://localhost:4000/api/profile',
      env: 'PROFILE_SERVICE_URL'
    },
    apiKey: {
      doc: 'Optional API key sent to the profile service',
      format: String,
      default: '',
      env: 'PROFILE_SERVICE_API_KEY',
      sensitive: true
    },
    apiKeyHeader: {
      doc: 'Header name used when sending the profile service API key',
      format: String,
      default: 'x-api-key',
      env: 'PROFILE_SERVICE_API_KEY_HEADER'
    }
  },
  auth: {
    hubOrigin: {
      doc: 'Public origin for the coordinating hub',
      format: String,
      default: 'http://localhost:3000',
      env: 'HUB_ORIGIN'
    },
    hubJwt: {
      cookieName: {
        doc: 'Cookie name that carries the hub-issued JWT',
        format: String,
        default: 'livestock_hub_jwt',
        env: 'HUB_JWT_COOKIE_NAME'
      },
      secret: {
        doc: 'Shared secret used to sign and verify hub-issued JWTs',
        format: String,
        default: 'local-dev-hub-jwt-signing-secret-please-change-1234567890',
        env: 'HUB_JWT_SECRET',
        sensitive: true
      },
      ttlSeconds: {
        doc: 'Hub-issued JWT time to live in seconds',
        format: Number,
        default: 14400,
        env: 'HUB_JWT_TTL_SECONDS'
      },
      issuer: {
        doc: 'Issuer claim for the hub-issued JWT',
        format: String,
        default: 'http://localhost:3000',
        env: 'HUB_JWT_ISSUER'
      },
      audience: {
        doc: 'Audience claim for the hub-issued JWT',
        format: String,
        default: 'livestock-spokes',
        env: 'HUB_JWT_AUDIENCE'
      }
    },
    oidc: {
      discoveryUrl: {
        doc: 'OpenID Connect discovery document used by the hub',
        format: String,
        default: '',
        env: 'OIDC_DISCOVERY_URL'
      },
      clientId: {
        doc: 'OpenID Connect client identifier for the hub',
        format: String,
        default: '',
        env: 'OIDC_CLIENT_ID'
      },
      clientSecret: {
        doc: 'OpenID Connect client secret for the hub',
        format: String,
        default: '',
        env: 'OIDC_CLIENT_SECRET',
        sensitive: true
      },
      serviceId: {
        doc: 'Defra CI service identifier used during sign in',
        format: String,
        default: '',
        env: 'OIDC_SERVICE_ID'
      },
      redirectPath: {
        doc: 'Callback path used for the authorization code flow',
        format: String,
        default: '/auth/callback',
        env: 'OIDC_REDIRECT_PATH'
      }
    }
  }
})

config.validate({ allowed: 'strict' })
