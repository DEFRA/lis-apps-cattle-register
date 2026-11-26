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
      /<div class="lis-scrollable-pane" data-module="lis-scrollable-pane" role="region" tabindex="0" aria-label="Cattle births to register">\s*<table class="govuk-table" id="calves">\s*<caption class="govuk-table__caption govuk-visually-hidden">Cattle births to register<\/caption>/
    )
    expect(html).toContain('>UK123456301550</a>')
  })

  test('it aligns the status column to the right, as the design does', () => {
    // Act
    const html = render({
      calves: [
        {
          id: 'UK123456301550',
          href: '/check',
          earTagNumber: 'UK123456301550',
          isReady: false
        }
      ]
    })

    // Assert
    expect(html).toMatch(
      /<th scope="col" class="govuk-table__header govuk-table__header--numeric">Status<\/th>/
    )
    expect(html).toMatch(
      /<td class="govuk-table__cell govuk-table__cell--numeric">\s*<strong class="govuk-tag govuk-tag--blue">\s*Incomplete\s*<\/strong>/
    )
  })

  test('it shows no pane when there are no calves', () => {
    // Act
    const html = render({ calves: [] })

    // Assert
    expect(html).not.toContain('lis-scrollable-pane')
    expect(html).toMatch(
      /<div class="govuk-inset-text">\s*No calves have been added.\s*<\/div>/
    )
  })
})
