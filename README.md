# Slack for Raycast

Quick launcher for Slack conversations directly from Raycast.

## Features

- **Slack Conversations** — Search and open any Slack conversation (DMs, groups, public and private channels) directly in the Slack app.
- **Slack Sync** — Background command that syncs conversations and users from Slack every 10 minutes, keeping the list always up to date.
- Conversations are sorted by last used, so your most recent chats are always on top.

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
| Slack Sync | Sync conversations from Slack | Background (every 10min) |

## Actions

- **Ir** — Open conversation in Slack and close Raycast
- **Ver** — Open conversation in Slack and keep Raycast suspended
