/*
 * A journey is the steps a record goes through, in order, and the questions
 * its pages ask of them. A record is its answers so far, as one flat object.
 * Nothing here reads or saves anything, nor knows of any one journey: each
 * function takes the record and answers from it.
 */
/** @import { Context, ObjectSchema, ValidationError } from 'joi' */

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
 * @property {(options: TOptions, saved: TRecord) => Context} [context]
 *   what the schema's rules refer to, from the options and the record as it
 *   is saved; absent when they refer to nothing
 */

/**
 * @template TRecord - the record's answers
 * @template TOptions - what the journey's rules need beyond the record
 * @typedef {object} Journey - the questions a journey's pages ask of a record
 * @property {Step<TRecord, TOptions>[]} steps
 * @property {(record: TRecord, options: TOptions) =>
 *   Step<TRecord, TOptions> | undefined} firstIncompleteStep
 * @property {(page: string, record: TRecord, values: Partial<TRecord>,
 *   options: Partial<TOptions>) => StepResult} validateStep - takes only
 *   the options the page's step needs
 * @property {(page: string, record: TRecord, answers: Partial<TRecord>) =>
 *   TRecord} withAnswers
 */

/**
 * @template TAnswers
 * @param {TAnswers} answers
 * @returns {TAnswers} the answers with surrounding spaces removed
 */
export function trimAnswers(answers) {
  return Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [key, value.trim()])
  )
}

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>} step
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
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>} step
 * @param {TRecord} record - as it would be saved
 * @param {TOptions} options
 * @param {TRecord} saved - the record as it is saved
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
 * @returns {Journey<TRecord, TOptions>} the questions the journey's pages ask
 *   of a record
 */
export function createJourney(steps) {
  /**
   * @template TRecord
   * @template TOptions
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
   * @template TRecord
   * @template TOptions
   * @param {TRecord} record
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
   * @template TRecord
   * @param {string} page
   * @param {TRecord} record - as saved
   * @param {Partial<TRecord>} answers - the page's answers, validated
   * @returns {TRecord} the record to save: the page's answers replaced, every
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
   * @template TRecord
   * @template TOptions
   * @param {string} page
   * @param {TRecord} record - as saved
   * @param {Partial<TRecord>} values - the page's answers, trimmed
   * @param {TOptions} options
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
