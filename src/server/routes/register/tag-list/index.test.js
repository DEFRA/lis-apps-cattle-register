import { readFileSync } from 'node:fs'
import nunjucks from 'nunjucks'
import { createNunjucksConfig } from '@defra/lis-infra-ui-services/nunjucks/plugin'
import { describe, expect, test } from 'vitest'

import { config } from '#config/config.js'

const { environment } = createNunjucksConfig({
  config,
  logger: {},
  moduleId: 'cattle-register'
}).options.compileOptions
const template = nunjucks.compile(
  readFileSync(new URL('./index.njk', import.meta.url), 'utf8'),
  environment
)

/**
 * @param {object} context - the view model
 * @returns {string} the page, rendered
 */
function render(context) {
  return template.render({
    getAssetPath: (asset) => asset,
    errorList: [],
    fieldErrors: {},
    values: {},
    ...context
  })
}

describe('tag list page', () => {
  test('it shows the calves in a pane that scrolls sideways, named as the design names it', () => {
    // Act
    const html = render({
      calves: [
        {
          id: 'UK123456301550',
          href: '/check',
          earTagNumber: 'UK123456301550',
          isReady: true
        }
      ]
    })

    // Assert
    expect(html).toMatch(
      /<div class="lis-scrollable-pane" data-module="lis-scrollable-pane" role="region" tabindex="0" aria-label="Cattle births to register">\s*<table class="govuk-table" id="calves">\s*<caption class="govuk-table__caption govuk-visually-hidden">Animals in this registration<\/caption>/
    )
    expect(html).toContain('>UK123456301550</a>')
  })

  test('it shows no pane when there are no calves', () => {
    // Act
    const html = render({ calves: [] })

    // Assert
    expect(html).not.toContain('lis-scrollable-pane')
    expect(html).toContain(
      'You have not added any animals to this registration.'
    )
  })
})
