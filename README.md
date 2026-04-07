# Slack for Raycast

Quick launcher for Slack conversations directly from Raycast.

## Features

- **Slack Conversations** — Search and open any Slack conversation (DMs, groups, public and private channels) directly in the Slack app.
- **Slack Conversation Tags** — Create, edit and delete tags to organize your conversations. Assign multiple tags to any conversation.
- **Slack Sync** — Background command that syncs conversations and users from Slack every 10 minutes, keeping the list always up to date.
- Fuzzy search across conversation names, topics and tags (accent and case insensitive, multi-term).
- Filter conversations by tag via dropdown.
- Conversations sorted by last used, so your most recent chats are always on top.
- Detail panel for group DMs showing the list of members (toggle with `Cmd+D`).
- Group DM names are sorted alphabetically and exclude the current user.

## Setup

1. Install the extension
2. On first launch, you'll be prompted to enter your **Slack User Token** (`xoxp-...`)
3. Run **Slack Sync** to fetch your conversations for the first time

### How to get your Slack token

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Create a new app or select an existing one
3. Under **OAuth & Permissions**, add the required scopes: `channels:read`, `groups:read`, `im:read`, `mpim:read`, `users:read`
4. Install the app to your workspace and copy the **User OAuth Token** (`xoxp-...`)

## Commands

| Command | Description | Mode |
|---------|-------------|------|
| Slack Conversations | Search and open conversations | View |
| Slack Conversation Tags | Create and manage tags for conversations | View |
| Slack Sync | Sync conversations and users from Slack | Background (every 10min) |

## Actions (Conversations)

| Action | Shortcut | Description |
|--------|----------|-------------|
| Ir | `Enter` | Open conversation in Slack and close Raycast |
| Ver | | Open conversation in Slack and keep Raycast suspended |
| Show/Hide Members | `Cmd+D` | Toggle detail panel with group DM members |
| Tags | `Cmd+T` | Add or remove tags from the conversation |

## Actions (Tags)

| Action | Shortcut | Description |
|--------|----------|-------------|
| Edit Tag | `Enter` | Edit tag name and color |
| Delete Tag | `Cmd+Backspace` | Delete tag and remove from all conversations |
| Create Tag | `Cmd+N` | Create a new tag |
