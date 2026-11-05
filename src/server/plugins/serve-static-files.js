import { createStaticFilesPlugin } from '@defra/lis-infra-ui-services/static-files'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { createAssetPathHelpers } from '@defra/lis-infra-ui-services/asset-path'
import { config } from '#config/config.js'

const { getAssetPaths } = createAssetPathHelpers({
  moduleId: 'cattle-register',
  assetPath: config.get('assetPath')
})

export const serveStaticFiles = createStaticFilesPlugin({
  assetPaths: getAssetPaths(),
  staticCacheTimeout: config.get('staticCacheTimeout'),
  noContentStatusCode: statusCodes.noContent
})
