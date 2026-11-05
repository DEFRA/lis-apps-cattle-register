const MILLISECONDS_PER_DAY = 86400000

const londonDateParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric'
})

/**
 * @typedef {object} CalendarDate
 * @property {number} day
 * @property {number} month - 1 to 12
 * @property {number} year
 */

/**
 * The calendar date in the UK at the given instant. Keepers report dates in
 * UK time, so a server clock in UTC must not shift "today" around midnight
 * during British Summer Time.
 * @param {Date} instant
 * @returns {CalendarDate}
 */
export function toUkCalendarDate(instant) {
  const parts = Object.fromEntries(
    londonDateParts
      .formatToParts(instant)
      .map(({ type, value }) => [type, Number(value)])
  )

  return { day: parts.day, month: parts.month, year: parts.year }
}

/**
 * @param {CalendarDate} date
 * @returns {string} D/M/YYYY without leading zeros, as the date picker uses
 */
export function formatCalendarDate({ day, month, year }) {
  return `${day}/${month}/${year}`
}

/**
 * @param {CalendarDate} from
 * @param {CalendarDate} to
 * @returns {number} whole days from `from` to `to`, negative when `to` is earlier
 */
export function daysBetween(from, to) {
  return (
    (Date.UTC(to.year, to.month - 1, to.day) -
      Date.UTC(from.year, from.month - 1, from.day)) /
    MILLISECONDS_PER_DAY
  )
}
