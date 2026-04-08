import { LocalStorage } from "@raycast/api";
import { Conversation } from "./requests";

const MAX_TRACKED = 25;

const FOLLOWED_KEY = "followed_conversations";
const IGNORED_KEY = "ignored_conversations";

export async function getFollowed(): Promise<string[]> {
  const json = await LocalStorage.getItem<string>(FOLLOWED_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveFollowed(ids: string[]): Promise<void> {
  await LocalStorage.setItem(FOLLOWED_KEY, JSON.stringify(ids));
}

export async function toggleFollow(conversationId: string): Promise<string[]> {
  const ids = await getFollowed();
  const updated = ids.includes(conversationId)
    ? ids.filter((id) => id !== conversationId)
    : ids.length >= 25
      ? ids
      : [...ids, conversationId];
  await saveFollowed(updated);
  return updated;
}

export async function getIgnored(): Promise<string[]> {
  const json = await LocalStorage.getItem<string>(IGNORED_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveIgnored(ids: string[]): Promise<void> {
  await LocalStorage.setItem(IGNORED_KEY, JSON.stringify(ids));
}

export function getTrackedIds(
  conversations: Record<string, Conversation>,
  followed: string[],
  ignored: string[],
): string[] {
  const tracked = new Set<string>(followed.filter((id) => conversations[id]));

  if (tracked.size < MAX_TRACKED) {
    const remaining = Object.values(conversations)
      .filter((c) => !tracked.has(c.id) && !ignored.includes(c.id) && c.lastUsed)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));

    for (const conv of remaining) {
      if (tracked.size >= MAX_TRACKED) break;
      tracked.add(conv.id);
    }
  }

  return Array.from(tracked);
}

export async function toggleIgnore(conversationId: string): Promise<string[]> {
  const ids = await getIgnored();
  const updated = ids.includes(conversationId)
    ? ids.filter((id) => id !== conversationId)
    : [...ids, conversationId];
  await saveIgnored(updated);
  return updated;
}
