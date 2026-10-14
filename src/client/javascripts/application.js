import {
  Button,
  Checkboxes,
  createAll,
  ErrorSummary,
  Radios
} from 'govuk-frontend'
import { errorPageComponents } from '@defra/lis-infra-ui-services/components/error-pages'
import { layoutComponents } from '@defra/lis-infra-ui-services/components/layout'
import { initAllAutocompletes } from '@defra/lis-infra-ui-services/components/autocomplete'

for (const component of new Set([
  ...layoutComponents,
  ...errorPageComponents,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios
])) {
  createAll(component)
}
initAllAutocompletes()
