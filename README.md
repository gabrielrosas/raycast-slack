# Slack for Raycast

Quick launcher for Slack conversations + a viewer that turns threads and channels into Markdown, with AI summarize / translate / Q&A on top.

## Features

- **Slack Conversations** — Search and open any Slack conversation (DMs, group DMs, public and private channels) directly in the Slack app. Tag, follow, ignore.
- **Slack Show Messages** — Fetch the messages of a thread or a channel by pasting its URL or ID (or launching from Conversations), and view them as Markdown. Actions: Copy, Export, Translate, Summarize, Ask AI. Each message header includes the avatar and a Raycast quicklink on the `💬 N respostas` indicator so you can dive into the thread without leaving Raycast.
- **Slack Conversation Tags** — Create, edit and delete tags to organize your conversations. Assign multiple tags to any conversation.
- **Slack Sync** — Background command that syncs conversations and users from Slack every 10 minutes and refreshes unread counts.
- Fuzzy search across conversation names, topics, IDs and tags (accent and case insensitive, multi-term).
- Filter conversations by tag via dropdown.
- Conversations sorted by last used.
- Detail panel for group DMs showing the list of members (toggle with `Opt+D`).

## Setup

1. Install the extension.
2. On first launch, you'll be prompted to enter your **Slack User Token** (`xoxp-...`).
3. Run **Slack Sync** to populate conversations, users and workspace info.

### How to get your Slack token

1. Go to [Slack API Apps](https://api.slack.com/apps).
2. Create a new app or select an existing one.
3. Under **OAuth & Permissions**, add the required scopes:
   - List / sync: `channels:read`, `groups:read`, `im:read`, `mpim:read`, `users:read`.
   - Read messages (used by unread tracking, Show Messages, Translate, Summarize, Ask AI): `channels:history`, `groups:history`, `im:history`, `mpim:history`.
4. Install the app to your workspace and copy the **User OAuth Token** (`xoxp-...`).

### Preferences

| Preference | Description |
|---|---|
| Slack Token | `xoxp-...` user token (required). |
| Default Language | Output language used by Summarize and Translate. Default: Portuguese (BR). |

AI features (Summarize, Translate, Ask AI) require Raycast Pro.

## Commands

| Command | Description | Mode |
|---|---|---|
| Slack Conversations | Search and open conversations | View |
| Slack Conversation Tags | Create and manage tags | View |
| Slack Show Messages | Show messages from a thread / channel as Markdown | View |
| Slack Following | Track followed conversations and unread counts | View |
| Slack Sync | Sync conversations and users from Slack | Background (every 10min) |

## Slack Show Messages

Entry points:

- Paste a thread URL: `https://{workspace}.slack.com/archives/{C…}/p…` → opens directly.
- Paste a channel URL: `https://{workspace}.slack.com/archives/{C…}` → opens the range picker.
- Paste a bare channel/DM ID: `C0AAPQN0UEL`, `D01ABC123`, `G0XYZ…` → opens the range picker.
- Launch from **Slack Conversations** with `Opt+M` on any conversation → opens the range picker pre-targeting that conversation.

Range picker (List, keyboard-first):

| Item | Range |
|---|---|
| Hoje (default) | From 00:00 of today to now |
| Não lidas | Since the user's `last_read` |
| Últimas 24h | Rolling last 24 hours |
| Últimos 7 dias | Last week |
| Últimos 30 dias | Last month |
| Customizado | Form with two date pickers |

Actions on the rendered Markdown:

| Action | Shortcut |
|---|---|
| Copy Markdown | `Enter` |
| Export Markdown | `Cmd+E` (saves to `~/Downloads`) |
| Ask AI | `Cmd+Shift+A` (free-form prompt over the conversation) |
| Translate with AI | `Cmd+T` (target language from preferences) |
| Summarize with AI | `Cmd+I` (structured: context / decisions / actions / open items / next steps) |

Notes:
- Fetched messages are capped at one page (~200 top-level messages). A toast and a header note appear when the range overflows — refine the filter to see more.
- Each message header shows the user's avatar inline (sized via Raycast's `?raycast-width/height` params, rendered at native 32px when exported).
- The `💬 N respostas` indicator is a Raycast quicklink — clicking re-opens Show Messages directly inside that thread.

## Actions (Conversations)

| Action | Shortcut | Description |
|---|---|---|
| Ir | `Enter` | Open conversation in Slack and close Raycast |
| Ver | `Opt+Enter` | Open conversation in Slack and keep Raycast suspended |
| Show Messages | `Opt+M` | Open Slack Show Messages targeting this conversation |
| Show / Hide Members | `Opt+D` | Toggle detail panel with group DM members |
| Follow / Unfollow | `Opt+F` | Toggle follow state |
| Ignore / Unignore | `Opt+I` | Toggle ignore state |
| Tags | `Opt+Shift+T` | Add or remove tags from the conversation |
| Open Unreads | `Opt+Shift+A` | Open Slack's Unreads view |

## Actions (Tags)

| Action | Shortcut | Description |
|---|---|---|
| Edit Tag | `Enter` | Edit tag name and color |
| Delete Tag | `Cmd+Backspace` | Delete tag and remove from all conversations |
| Create Tag | `Cmd+N` | Create a new tag |
