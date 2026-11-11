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
 * @template TRecord - the record's answers
 * @template TOptions - what the journey's rules need beyond the record
 * @typedef {object} Step
 * @property {string} page - the step's page, as in its path
 * @property {ObjectSchema} schema - the step's rules, over
 *   the answers the step owns; each rule's message is the code of its error
 * @property {(options: TOptions, saved: Partial<TRecord>) => object} [context]
 *   what the schema's rules refer to, from the options and the record as it
 *   is saved; absent when they refer to nothing
 */

/**
 * @typedef {Step<any, any>} AnyStep
 */

/**
 * The questions a journey's pages ask of a record. A record is typed as
 * partial throughout: it has only the answers of the pages saved so far.
 * @template TRecord - the record's answers
 * @template TOptions - what the journey's rules need beyond the record
 * @typedef {object} Journey
 * @property {Step<TRecord, TOptions>[]} steps - in order
 * @property {(record: Partial<TRecord>, options: TOptions) => Step<TRecord, TOptions> | undefined} firstIncompleteStep
 * @property {(page: string, record: Partial<TRecord>) => string | undefined} pageOwed
 * @property {(page: string, record: Partial<TRecord>, values: Partial<TRecord>, options?: TOptions) => StepResult} validateStep
 * @property {(page: string, record: Partial<TRecord>, answers: Partial<TRecord>) => Partial<TRecord>} withAnswers
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
 * @param {AnyStep} step
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
 * @param {AnyStep} step
 * @param {JourneyRecord} record - as it would be saved
 * @param {Options} options
 * @param {JourneyRecord} saved - the record as it is saved
 * @returns {StepResult} what the step's rules make of the record
 */
function judge(step, record, options, saved) {
  const { error, warning } = step.schema.validate(record, {
    abortEarly: false,
    allowUnknown: true,
    context: step.context?.(options, saved) ?? {}
  })

  return { errors: fieldResults(error), warnings: fieldResults(warning) }
}

/**
 * @template TRecord - the record's answers
 * @template TOptions - what the journey's rules need beyond the record
 * @param {Step<TRecord, TOptions>[]} steps - the journey's steps, in order
 * @returns {Journey<TRecord, TOptions>}
 */
export function createJourney(steps) {
  /**
   * @param {string} page
   * @returns {Step<TRecord, TOptions>}
   */
  function stepFor(page) {
    const step = steps.find((candidate) => candidate.page === page)

    if (!step) {
      throw new Error(`No step for page "${page}"`)
    }

    return step
  }

  /**
   * @param {Partial<TRecord>} record
   * @param {TOptions} options
   * @returns {Step<TRecord, TOptions> | undefined} the first step whose answers are missing or
   *   wrong; undefined when the record is complete
   */
  function firstIncompleteStep(record, options) {
    return steps.find(
      (step) => judge(step, record, options, record).errors.length
    )
  }

  /**
   * @param {string} page
   * @param {Partial<TRecord>} record - as saved
   * @param {Partial<TRecord>} answers - the page's answers, validated
   * @returns {Partial<TRecord>} the record to save: the page's answers replaced, every
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
   * @param {Partial<TRecord>} record - as saved
   * @param {Partial<TRecord>} values - the page's answers, trimmed
   * @param {TOptions} [options]
   * @returns {StepResult}
   */
  function validateStep(page, record, values, options = {}) {
    return judge(
      stepFor(page),
      withAnswers(page, record, values),
      options,
      record
    )
  }

  /**
   * Whether the record belongs on a page yet. Asks only whether the earlier
   * steps have their answers: those were validated when they were saved.
   * @param {string} page
   * @param {Partial<TRecord>} record - as saved
   * @returns {string | undefined} the page of the first earlier step with an
   *   answer missing; undefined when the record belongs on the page
   */
  function pageOwed(page, record) {
    return steps
      .slice(0, steps.indexOf(stepFor(page)))
      .find((step) => keysOf(step).some((key) => !record[key]))?.page
  }

  return { steps, firstIncompleteStep, pageOwed, validateStep, withAnswers }
}
