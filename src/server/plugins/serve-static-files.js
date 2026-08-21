import { createStaticFilesPlugin } from '@defra/lis-infra-ui-services/static-files'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { createBasePathHelpersForConfig } from '@defra/lis-infra-ui-services/base-path'
import { config } from '#config/config.js'

const { getAssetPaths } = createBasePathHelpersForConfig(config)

export const serveStaticFiles = createStaticFilesPlugin({
  assetPaths: getAssetPaths(),
  staticCacheTimeout: config.get('staticCacheTimeout'),
  noContentStatusCode: statusCodes.noContent
})
