import { getIntlLocale } from './store.js';

// ISO date values sent to APIs stay unchanged; these helpers format display text only.
export function shortDate(value) {
  return new Intl.DateTimeFormat(getIntlLocale(), { month: '2-digit', day: '2-digit', timeZone: 'UTC' })
    .formatToParts(new Date(`${value}T00:00:00Z`))
    .filter(part => part.type === 'month' || part.type === 'day').map(part => part.value).join('/');
}
