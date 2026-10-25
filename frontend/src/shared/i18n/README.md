# Frontend languages

Supported locales: `vi` (default), `en-US`, `zh-CN` (Simplified Chinese).
The language picker is available in PMS and Manager headers, sign-in, and hotel
profile settings. The selection is stored under `loha-ui-language` in localStorage,
synchronized across tabs, and updates `document.documentElement.lang`.
If storage is unavailable, the selection remains usable in memory.

Each locale has a flat `key: value` JSON dictionary in `locales/`. Keep the same
keys and named parameters in all three files. Missing translations fall back to
Vietnamese; unknown keys display the key so missing entries remain visible.

```jsx
import { useI18n } from './useI18n.js';

function SaveButton() {
  const { t } = useI18n();
  return <button type="submit">{t('common.save')}</button>;
}
```

Use named parameters for complete sentences:

```jsx
t('hk.taskTitle', { room: '101' });
```

Components migrated from existing UI use `useI18n()` to subscribe and the stable
`tUi` import to translate keys. `tr` / `labelUi` translate existing fixed metadata
such as navigation, role, status and feature labels using the Vietnamese catalog.
Use this compatibility helper only for known UI labels. Hotel names, employee
names, room type names, guest details, notes and form values are business data and
must remain unchanged.

`LegacyI18nBridge` covers older screens whose visible literals have not yet been
moved to named keys. Its generated catalogs contain fixed UI copy and templates,
and it updates text, placeholders, titles, and accessible labels when the locale
changes. Add `data-i18n-ignore` to a container whose text is business or user data
that could otherwise look like a fixed UI label. New components should continue
to use named `t(...)` keys rather than relying on the bridge.

The API client resolves backend-owned display references before publishing JSON
responses to React state. Use `i18n:key.name` for a fixed value, or a descriptor
such as `{ "$i18n": "key.name", "values": { "id": "123" } }` when the frontend
must interpolate API data. Definitions, feature labels and notification copy live
in the frontend locale files; the backend only returns stable keys and values.
The compatibility catalog still translates existing validation messages while
tenant and user data stays unchanged.

The dictionaries cover shared controls, PMS/Manager navigation, sign-in, settings,
dashboard, profile, housekeeping, room status and the daily rate matrix, with
shared labels reused in other screens. Remaining specialized copy and messages
provided by the backend should use stable translation keys instead of adding
language tables to Python. Interface language is independent of the hotel's
stored profile language.

Display dates and numbers use the selected locale; API date values remain ISO,
and business dates continue to use the hotel's time zone. Currency and timezone
settings are unaffected. Changing the language does not remount pages or discard
form drafts or current selections.

Run `npm run i18n:audit` to find Vietnamese source literals not covered by either
catalog layer. Run `npm test` to verify catalog completeness, parameters,
persistence, fallback, tab synchronization, formatting and key references.
