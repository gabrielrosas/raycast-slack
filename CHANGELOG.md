# Changelog

## [1.0.0] - 2026-04-07

### Added

- **Slack Conversations** command — searchable list of all Slack conversations (DMs, group DMs, public and private channels)
- **Slack Conversation Tags** command — create, edit and delete tags to organize conversations
- **Slack Sync** command — background sync of conversations and users every 10 minutes
- Fuzzy search with accent/case insensitive matching across names, topics and tags
- Tag filtering via dropdown in the search bar
- Detail panel for group DMs showing member list (toggle with `Cmd+D`)
- Tag assignment on conversations via submenu (`Cmd+T`)
- Conversations sorted by last used
- Group DM names sorted alphabetically, excluding the current user
- Current user detection via `auth.test` API
- Slack token stored securely in Raycast Preferences
- Custom icons for each command
