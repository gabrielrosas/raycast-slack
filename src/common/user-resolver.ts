import { getConversationInfo } from "./api/conversations";
import { getUserInfo } from "./api/users";
import { ChannelInfo, SlackMessage, UserInfo } from "./api/types";
import { loadConversations } from "./storage/conversations";
import { loadUserDirectory, saveUserDirectory } from "./storage/users";

export function collectUserIds(messages: SlackMessage[]): string[] {
  const ids = new Set<string>();
  const mentionPattern = /<@([UW][A-Z0-9]+)/g;
  for (const m of messages) {
    if (m.user) ids.add(m.user);
    if (m.text) {
      for (const match of m.text.matchAll(mentionPattern)) ids.add(match[1]);
    }
  }
  return Array.from(ids);
}

export async function enrichUserDirectory(
  directory: Record<string, UserInfo>,
  neededIds: string[],
): Promise<Record<string, UserInfo>> {
  const missing = neededIds.filter((id) => !directory[id]);
  if (missing.length === 0) return directory;

  const fetched = await Promise.all(missing.map((id) => getUserInfo(id)));
  const enriched = { ...directory };
  for (const user of fetched) {
    if (user) enriched[user.id] = user;
  }

  await saveUserDirectory(enriched);
  return enriched;
}

export async function loadAndEnrichUsers(messages: SlackMessage[]): Promise<Record<string, UserInfo>> {
  const cached = await loadUserDirectory();
  return enrichUserDirectory(cached, collectUserIds(messages));
}

function isPrivateChannelInfo(info: ChannelInfo): boolean {
  return Boolean(info.is_private || info.is_im || info.is_mpim);
}

export async function resolveChannelName(channelId: string): Promise<{ name: string; isPrivate: boolean }> {
  const cached = await loadConversations();
  const hit = cached[channelId];
  if (hit) {
    return {
      name: hit.name,
      isPrivate: hit.type === "private_channel" || hit.type === "mpim" || hit.type === "im",
    };
  }
  const info = await getConversationInfo(channelId);
  if (info) {
    return { name: info.name ?? channelId, isPrivate: isPrivateChannelInfo(info) };
  }
  return { name: channelId, isPrivate: false };
}
