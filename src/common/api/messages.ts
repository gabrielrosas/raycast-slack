import { slackAxios, SlackApiError } from "./client";
import { SlackMessage } from "./types";

type GetHistoryFullResponse = {
  ok: boolean;
  error?: string;
  messages?: SlackMessage[];
  has_more?: boolean;
  response_metadata?: { next_cursor?: string };
};

export async function getChannelMessages(
  channelId: string,
  options: { oldest?: string; latest?: string; limit?: number } = {},
): Promise<{ messages: SlackMessage[]; truncated: boolean }> {
  const response = await slackAxios.get<GetHistoryFullResponse>("/conversations.history", {
    params: {
      channel: channelId,
      limit: options.limit ?? 200,
      oldest: options.oldest,
      latest: options.latest,
      inclusive: true,
    },
  });

  if (!response.data.ok) {
    throw new SlackApiError(response.data.error ?? "unknown_error");
  }

  return {
    messages: response.data.messages ?? [],
    truncated: Boolean(response.data.has_more),
  };
}

type GetRepliesResponse = {
  ok: boolean;
  error?: string;
  messages?: SlackMessage[];
  has_more?: boolean;
  response_metadata?: { next_cursor?: string };
};

export async function getThreadReplies(channelId: string, threadTs: string): Promise<SlackMessage[]> {
  const out: SlackMessage[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await slackAxios.get<GetRepliesResponse>("/conversations.replies", {
      params: { channel: channelId, ts: threadTs, limit: 200, cursor },
    });

    if (!response.data.ok) {
      throw new SlackApiError(response.data.error ?? "unknown_error");
    }

    out.push(...(response.data.messages ?? []));

    if (!response.data.has_more) break;
    cursor = response.data.response_metadata?.next_cursor;
    if (!cursor) break;
  }

  return out;
}
