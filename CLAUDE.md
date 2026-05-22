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

## Pending review points (to discuss)

1. **AppleScript command injection** — `src/conversations.tsx:69` and `src/unread.tsx:33` interpolate `conversation.url` into `do shell script "open '...'"`. If a value ever contains `'` or `;` it becomes local RCE. Switch to `child_process.execFile` or Raycast's `open()` API.
2. **Mutation of `state` before `setState`** — `src/conversations.tsx:62-66` and `src/unread.tsx:88-92` mutate `state[id]` in place, then call `setState({...state})`. Works by accident; should use immutable updates.
3. **Recursive pagination without bounds** — `src/common/requests.ts:30-52` and `:71-87` recurse and spread arrays at each level. For large workspaces this is O(n²) memory. Convert to a `while` loop accumulating into one array.
4. **`MAX_TRACKED` constant duplicated** — `src/common/follows.ts:4` defines `MAX_TRACKED = 25` but `toggleFollow` on line 22 uses the literal `25`. They can drift.
5. **Mixed PT/EN UI strings** — "Ir"/"Ver"/"Nenhuma conversa não lida" live next to "Follow"/"Mark as Read"/"Refresh". Pick one language.
6. **Refresh logic duplicated** — `src/unread.tsx:48-69` duplicates `src/sync.ts:21-39`. Extract a `refreshUnreadCounts(state)` helper to `common/`.
7. **`Mark as Read` doesn't update `lastUsed`** — `src/unread.tsx:100-109` zeros `unreadCount` but skips `lastUsed`, while `conversations.tsx` updates both. Decide whether this asymmetry is intentional.
8. **`dayjs` UTC plugin unused** — `src/config/dayjs.ts` extends UTC, but `sync.ts:42` calls `dayjs().format(...)` (local time). Remove the plugin or actually use it.
9. **`refreshKey` workaround in `tags.tsx:81`** — Forces remount via `tag.id + refreshKey`. `usePromise.revalidate()` is enough.
10. **No invalid-token feedback** — If `xoxp-...` is invalid/expired, `getConversations` logs and returns `[]`; UI shows empty list silently. Surface the auth error.
