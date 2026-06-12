# Slack Raycast Extension

## Project overview

Raycast extension for working with Slack: launch conversations, view threads/channels as Markdown, and run AI actions (translate, summarize, ask) on top. Uses the Slack Web API; caches conversations, users, and workspace metadata in Raycast's LocalStorage.

## Architecture

Commands live at `src/` root (Raycast convention — file name = command `name` in `package.json`). Shared UI lives in `src/components/`. Pure helpers, API layer, markdown rendering, and storage wrappers live in `src/common/`.

```
src/
├── conversations.tsx         # Slack Conversations — searchable list + actions
├── messages.tsx              # Slack Show Messages — entry point, branches on URL kind
├── unread.tsx                # Slack Following — followed conversations + unread tracking
├── tags.tsx                  # Slack Conversation Tags
├── sync.ts                   # Background sync (every 10min)
├── components/
│   ├── range-picker.tsx      # List of presets (Hoje, Não lidas, 24h, 7d, 30d, Customizado) + push-based Detail
│   ├── messages-detail.tsx   # Detail with actions: Copy / Export / Ask AI / Translate / Summarize
│   ├── summary.tsx           # AI summary view (structured Markdown output)
│   ├── translate.tsx         # AI translation view (uses Default Language preference)
│   └── ask-ai.tsx            # Form + Detail for free-form questions about the conversation
└── common/
    ├── api/                  # Slack Web API layer (split per resource)
    │   ├── client.ts         # slackAxios instance + SlackApiError
    │   ├── types.ts          # SlackMessage, SlackBlock, RichText*, Conversation, UserInfo
    │   ├── users.ts          # users.list, users.info, auth.test, buildUserDirectory
    │   ├── conversations.ts  # conversations.list/info, channel unread + last_read
    │   ├── messages.ts       # conversations.history, conversations.replies
    │   └── data.ts           # high-level getData() used by sync
    ├── markdown/             # Slack content → Markdown
    │   ├── builder.ts        # buildThreadMarkdown / buildChannelMarkdown
    │   ├── blocks.ts         # rich_text blocks → Markdown (primary path)
    │   ├── mrkdwn.ts         # legacy mrkdwn text-field fallback
    │   └── emoji.ts          # :shortcode: → Unicode (with curated table)
    ├── storage/              # LocalStorage wrappers
    │   ├── conversations.ts
    │   ├── users.ts
    │   ├── current-user.ts   # caches auth.test result (incl. workspace url)
    │   ├── follows.ts
    │   └── tags.ts
    ├── flows.ts              # fetchAndBuildThread / fetchAndBuildChannel — wraps API + enrichment + render
    ├── range.ts              # RangeType union + computeRange + rangeLabelFor
    ├── slack-url.ts          # Parses thread URL, channel URL, or bare channel/DM ID
    ├── user-resolver.ts      # collectUserIds, enrichUserDirectory, resolveChannelName
    ├── workspace.ts          # resolveWorkspaceUrl, messagePermalink, showMessagesQuicklink
    ├── slack.ts              # AppleScript helpers (openSlackUnreads)
    └── preferences.ts        # getDefaultLanguage()
config/
└── dayjs.ts                  # dayjs + utc plugin
```

## Conventions

- **Token + Default Language** live in Raycast Preferences (`token` is `password` type, `defaultLanguage` is `dropdown`). Never hardcode secrets.
- **HTTP**: single shared `slackAxios` instance with the bearer pre-set in headers. Don't import `axios` directly in feature code; import `slackAxios` from `common/api/client.ts`.
- **Errors**: API functions throw `SlackApiError` with the Slack `error` code (e.g. `not_in_channel`, `missing_scope`). Callers map to user-friendly hints via local `ERROR_HINTS` maps.
- **Markdown rendering** prefers structured `blocks` (rich_text) over the legacy `text` field. `hasRichText()` is the guard.
- **AI prompts** are written in English (instructions). The output language is parametric via the `Default Language` preference.
- **Re-entry**: Show Messages accepts a `LaunchProps.launchContext.url` so quicklinks in the rendered markdown can re-open the command into a specific thread.

## Commands (npm scripts)

- `npm run dev` — Raycast develop mode
- `npm run build` — Production build
- `npm run lint` — ESLint + Prettier + Raycast validations
- `npm run fix-lint` — Auto-fix lint issues

## Pending review points (to discuss)

These predate the recent restructure and most still apply. Line refs may be stale.

1. **AppleScript command injection** — `conversations.tsx` and `unread.tsx` interpolate `conversation.url` into `do shell script "open '...'"`. If a value ever contains `'` or `;` it becomes local RCE. Switch to `child_process.execFile` or Raycast's `open()` API (already imported elsewhere).
2. **Mutation of `state` before `setState`** — `conversations.tsx` and `unread.tsx` mutate `state[id]` in place, then call `setState({...state})`. Works by accident; should use immutable updates.
3. **Recursive pagination without bounds** — `getConversations` / `getUsers` in `common/api/conversations.ts` and `common/api/users.ts` still recurse. For large workspaces this is O(n²) memory. Convert to a `while` loop accumulating into one array.
4. **`MAX_TRACKED` constant duplicated** — `common/storage/follows.ts` defines the constant but `toggleFollow` uses the literal `25`. They can drift.
5. **Mixed PT/EN UI strings** — "Ir"/"Ver"/"Nenhuma conversa não lida" live next to "Follow"/"Mark as Read"/"Refresh". Pick one language for the whole extension.
6. **Refresh logic duplicated** — `unread.tsx` duplicates `sync.ts` for unread counts. Extract a `refreshUnreadCounts(state)` helper to `common/`.
7. **`Mark as Read` doesn't update `lastUsed`** — `unread.tsx` zeros `unreadCount` but skips `lastUsed`, while `conversations.tsx` updates both. Decide whether this asymmetry is intentional.
8. **`dayjs` UTC plugin unused** — `config/dayjs.ts` extends UTC, but everything still formats in local time. Remove the plugin or actually use it.
9. **`refreshKey` workaround in `tags.tsx`** — Forces remount via `tag.id + refreshKey`. `usePromise.revalidate()` is enough.
10. **No invalid-token feedback** — If `xoxp-...` is invalid/expired, `getConversations` logs and returns `[]`; UI shows empty list silently. Surface the auth error.
