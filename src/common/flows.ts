import { getChannelMessages, getThreadReplies } from "./api/messages";
import { buildChannelMarkdown, buildThreadMarkdown } from "./markdown/builder";
import { ComputedRange } from "./range";
import { loadAndEnrichUsers, resolveChannelName } from "./user-resolver";
import { resolveWorkspaceUrl } from "./workspace";

export type ThreadResult = { markdown: string; messageCount: number };

export async function fetchAndBuildThread(
  channelId: string,
  threadTs: string,
  originalUrl: string,
): Promise<ThreadResult> {
  const messages = await getThreadReplies(channelId, threadTs);
  const [users, channel, workspaceUrl] = await Promise.all([
    loadAndEnrichUsers(messages),
    resolveChannelName(channelId),
    resolveWorkspaceUrl(originalUrl),
  ]);

  const markdown = buildThreadMarkdown({
    messages,
    channelName: channel.name,
    channelIsPrivate: channel.isPrivate,
    originalUrl,
    users,
    channelId,
    workspaceUrl,
  });

  return { markdown, messageCount: messages.length };
}

export type ChannelResult = { markdown: string; truncated: boolean; messageCount: number };

export async function fetchAndBuildChannel(
  channelId: string,
  range: ComputedRange,
  rangeLabel: string,
  originalUrl: string,
  channelName?: string,
  channelIsPrivate?: boolean,
): Promise<ChannelResult> {
  const fetched = await getChannelMessages(channelId, range);

  let resolvedName = channelName;
  let resolvedPrivate = channelIsPrivate;
  if (resolvedName === undefined) {
    const channel = await resolveChannelName(channelId);
    resolvedName = channel.name;
    resolvedPrivate = channel.isPrivate;
  }

  const [users, workspaceUrl] = await Promise.all([
    loadAndEnrichUsers(fetched.messages),
    resolveWorkspaceUrl(originalUrl),
  ]);

  const markdown = buildChannelMarkdown({
    messages: fetched.messages,
    channelName: resolvedName,
    channelIsPrivate: resolvedPrivate,
    originalUrl,
    users,
    rangeLabel,
    truncated: fetched.truncated,
    channelId,
    workspaceUrl,
  });

  return { markdown, truncated: fetched.truncated, messageCount: fetched.messages.length };
}
