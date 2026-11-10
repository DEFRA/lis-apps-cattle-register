import { TZDate } from '@date-fns/tz'

const UK_TIME_ZONE = 'Europe/London'

// A date as the date picker writes it and keepers type it: day/month/year
// without leading zeros, in date-fns format tokens
export const DATE_FORMAT = 'd/M/yyyy'

/**
 * The given instant on the UK's clock. Keepers report dates in UK time, so a
 * server clock in UTC must not shift "today" around midnight during British
 * Summer Time.
 * @param {Date} instant
 * @returns {TZDate}
 */
export function toUkDate(instant) {
  return new TZDate(instant, UK_TIME_ZONE)
}
