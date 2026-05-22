import { slackAxios } from "./client";
import { ChannelInfo } from "./types";

export type RawConversation = {
  id: string;
  updated: number;
  user?: string;
  name?: string;
  name_normalized?: string;
  is_im?: boolean;
  is_mpim?: boolean;
  is_channel?: boolean;
  is_private?: boolean;
  is_archived?: boolean;
  is_user_deleted?: boolean;
  context_team_id: string;
  topic?: { value: string };
};

type GetConversationsResponse = {
  ok: boolean;
  channels: RawConversation[];
  response_metadata: { next_cursor?: string };
};

export async function getConversations(cursor?: string): Promise<RawConversation[]> {
  console.log("getConversations", cursor || "start");
  try {
    const response = await slackAxios.get<GetConversationsResponse>("/conversations.list", {
      params: {
        limit: 1000,
        cursor,
        types: "im,mpim,public_channel,private_channel",
        exclude_archived: true,
      },
    });
    if (response.data.response_metadata.next_cursor) {
      return [...response.data.channels, ...(await getConversations(response.data.response_metadata.next_cursor))];
    }
    return response.data.channels;
  } catch (error) {
    console.error(error);
    return [];
  }
}

type GetConversationInfoFullResponse = {
  ok: boolean;
  error?: string;
  channel?: ChannelInfo;
};

export async function getConversationInfo(channelId: string): Promise<ChannelInfo | null> {
  try {
    const response = await slackAxios.get<GetConversationInfoFullResponse>("/conversations.info", {
      params: { channel: channelId },
    });
    if (!response.data.ok) return null;
    return response.data.channel ?? null;
  } catch (error) {
    console.error(`[info] Error fetching ${channelId}:`, error);
    return null;
  }
}

export async function getChannelLastRead(channelId: string): Promise<string | null> {
  try {
    const response = await slackAxios.get<{ ok: boolean; channel?: { last_read?: string } }>("/conversations.info", {
      params: { channel: channelId },
    });
    if (!response.data.ok) return null;
    return response.data.channel?.last_read ?? null;
  } catch (error) {
    console.error(`[info] Error fetching last_read for ${channelId}:`, error);
    return null;
  }
}

type GetConversationInfoResponse = {
  ok: boolean;
  channel: {
    unread_count?: number;
    unread_count_display?: number;
    last_read?: string;
  };
};

type GetHistoryResponse = {
  ok: boolean;
  messages: { ts: string }[];
};

export async function getConversationUnreadCount(channelId: string): Promise<{ unreadCount: number } | null> {
  try {
    const infoResponse = await slackAxios.get<GetConversationInfoResponse>("/conversations.info", {
      params: { channel: channelId },
    });
    const ch = infoResponse.data.channel;

    if (ch.unread_count !== undefined) {
      return { unreadCount: ch.unread_count_display ?? ch.unread_count };
    }

    if (!ch.last_read) return { unreadCount: 0 };

    const historyResponse = await slackAxios.get<GetHistoryResponse>("/conversations.history", {
      params: { channel: channelId, oldest: ch.last_read, limit: 100 },
    });

    const unread = (historyResponse.data.messages || []).filter((m) => m.ts !== ch.last_read);
    return { unreadCount: unread.length };
  } catch (error) {
    console.error(`[info] Error fetching ${channelId}:`, error);
    return null;
  }
}
