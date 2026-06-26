import { createStaticFilesPlugin } from '@livestock/ui-services/static-files'
import { statusCodes } from '@livestock/ui-services/status-codes'
import { createBasePathHelpersForConfig } from '@livestock/ui-services/base-path'
import { config } from '#config/config.js'

const { getAssetPaths } = createBasePathHelpersForConfig(config)

export const serveStaticFiles = createStaticFilesPlugin({
  assetPaths: getAssetPaths(),
  staticCacheTimeout: config.get('staticCacheTimeout'),
  noContentStatusCode: statusCodes.noContent
})
