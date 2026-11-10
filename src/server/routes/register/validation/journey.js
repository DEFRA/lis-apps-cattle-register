/*
 * A journey is the steps a record goes through, in order, and the questions
 * its pages ask of them. A record is its answers so far, as one flat object.
 * Nothing here reads or saves anything, nor knows of any one journey: each
 * function takes the record and answers from it.
 */
/** @import { ObjectSchema, ValidationError } from 'joi' */

/**
 * @typedef {Record<string, string>} JourneyRecord - a record's answers so far
 */

/**
 * @typedef {Record<string, unknown>} Options - what a journey's rules need
 *   beyond the record
 */

/**
 * @typedef {{ field: string, code: string }} FieldResult
 */

/**
 * @typedef {object} StepResult
 * @property {FieldResult[]} errors - what stops the step being saved
 * @property {FieldResult[]} warnings - what the user is asked to confirm
 */

/**
 * @typedef {object} Step
 * @property {string} page - the step's page, as in its path
 * @property {ObjectSchema} schema - the step's rules, over
 *   the answers the step owns; each rule's message is the code of its error
 * @property {(options: Options, saved: JourneyRecord) => object} context
 *   what the schema's rules refer to, from the options and the record as it
 *   is saved
 */

/**
 * @param {Record<string, string>} answers
 * @returns {Record<string, string>} the answers with surrounding spaces removed
 */
export function trimAnswers(answers) {
  return Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [key, value.trim()])
  )
}

/**
 * @param {Step} step
 * @returns {string[]} the answers the step owns
 */
function keysOf(step) {
  return Object.keys(step.schema.describe().keys)
}

/**
 * @param {ValidationError} [report] - a schema's errors or
 *   warnings
 * @returns {FieldResult[]} each as its field and code, in the schema's order
 */
function fieldResults(report) {
  return (report?.details ?? []).map(({ path, message }) => ({
    field: path[0],
    code: message
  }))
}

/**
 * @param {Step} step
 * @param {JourneyRecord} record - as it would be saved
 * @param {Options} options
 * @param {JourneyRecord} saved - the record as it is saved
 * @returns {StepResult} what the step's rules make of the record
 */
function judge(step, record, options, saved) {
  const { error, warning } = step.schema.validate(record, {
    abortEarly: false,
    allowUnknown: true,
    context: step.context(options, saved)
  })

  return { errors: fieldResults(error), warnings: fieldResults(warning) }
}

/**
 * @param {Step[]} steps - the journey's steps, in order
 * @returns {object} the questions the journey's pages ask of a record
 */
export function createJourney(steps) {
  /**
   * @param {string} page
   * @returns {Step}
   */
  function stepFor(page) {
    const step = steps.find((candidate) => candidate.page === page)

    if (!step) {
      throw new Error(`No step for page "${page}"`)
    }

    return step
  }

  /**
   * @param {JourneyRecord} record
   * @param {Options} options
   * @returns {Step | undefined} the first step whose answers are missing or
   *   wrong; undefined when the record is complete
   */
  function firstIncompleteStep(record, options) {
    return steps.find(
      (step) => judge(step, record, options, record).errors.length
    )
  }

  /**
   * @param {string} page
   * @param {JourneyRecord} record - as saved
   * @param {Record<string, string>} answers - the page's answers, validated
   * @returns {JourneyRecord} the record to save: the page's answers replaced, every
   *   other answer kept
   */
  function withAnswers(page, record, answers) {
    return {
      ...record,
      ...Object.fromEntries(
        keysOf(stepFor(page)).map((key) => [key, answers[key]])
      )
    }
  }

  /**
   * What a page's rules make of its answers, judged as part of the record they
   * would be saved on.
   * @param {string} page
   * @param {JourneyRecord} record - as saved
   * @param {Record<string, string>} values - the page's answers, trimmed
   * @param {Options} options
   * @returns {StepResult}
   */
  function validateStep(page, record, values, options) {
    return judge(
      stepFor(page),
      withAnswers(page, record, values),
      options,
      record
    )
  }

  return { steps, firstIncompleteStep, validateStep, withAnswers }
}
