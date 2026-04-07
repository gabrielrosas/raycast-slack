# Slack Raycast Extension

## Project overview

Raycast extension for quickly accessing Slack conversations. Uses the Slack API to sync conversations/users and stores them locally via Raycast's LocalStorage.

## Architecture

- `src/conversations.tsx` — Main UI command. Reads conversations from LocalStorage, displays a searchable list, opens via deep links (`slack://`).
- `src/sync.ts` — Background sync command. Fetches conversations and users from Slack API, normalizes data, persists to LocalStorage. Runs every 10 minutes.
- `src/common/requests.ts` — Slack API layer. Handles paginated requests for conversations and users, formats data into the `Conversation` type.
- `src/config/dayjs.ts` — dayjs configured with UTC plugin.

## Conventions

- Slack token is stored in Raycast Preferences (type: password). Never hardcode secrets.
- All API requests use the `axios` library.
- Conversations are opened via AppleScript executing `slack://` deep links.
- Types are co-located with the API functions that use them in `common/requests.ts`.

## Commands

- `npm run dev` — Start development mode
- `npm run build` — Build the extension
- `npm run lint` — Run linter
- `npm run fix-lint` — Auto-fix lint issues
