import { getChannelMessages, getThreadReplies } from "./api/messages";
import { buildChannelMarkdown, buildThreadMarkdown } from "./markdown/builder";
import { ComputedRange } from "./range";
import { loadAndEnrichUsers, resolveChannelName } from "./user-resolver";

export type ThreadResult = { markdown: string; messageCount: number };

export async function fetchAndBuildThread(
  channelId: string,
  threadTs: string,
  originalUrl: string,
): Promise<ThreadResult> {
  const messages = await getThreadReplies(channelId, threadTs);
  const [users, channel] = await Promise.all([loadAndEnrichUsers(messages), resolveChannelName(channelId)]);

  const markdown = buildThreadMarkdown({
    messages,
    channelName: channel.name,
    channelIsPrivate: channel.isPrivate,
    originalUrl,
    users,
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

  const users = await loadAndEnrichUsers(fetched.messages);

  const markdown = buildChannelMarkdown({
    messages: fetched.messages,
    channelName: resolvedName,
    channelIsPrivate: resolvedPrivate,
    originalUrl,
    users,
    rangeLabel,
    truncated: fetched.truncated,
  });

  return { markdown, truncated: fetched.truncated, messageCount: fetched.messages.length };
}
