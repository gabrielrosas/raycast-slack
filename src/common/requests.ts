import axios from "axios";
import { Icon, getPreferenceValues } from "@raycast/api";

const { token } = getPreferenceValues<{ token: string }>();

type GetConversationsResponse = {
  ok: boolean;
  channels: {
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
    topic?: {
      value: string;
    };
  }[];
  response_metadata: {
    next_cursor?: string;
  };
};

export async function getConversations(cursor?: string): Promise<GetConversationsResponse["channels"]> {
  console.log("getConversations", cursor || "start");
  try {
    const response = await axios.get<GetConversationsResponse>(`https://slack.com/api/conversations.list`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

type GetUsersResponse = {
  ok: boolean;
  members: {
    id: string;
    name: string;
    real_name: string;
    profile: {
      real_name: string;
      image_original: string;
      image_32: string;
    };
  }[];
  response_metadata: {
    next_cursor?: string;
  };
};

export async function getUsers(cursor?: string): Promise<GetUsersResponse["members"]> {
  console.log("getUsers", cursor || "start");
  const response = await axios.get<GetUsersResponse>("https://slack.com/api/users.list", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      limit: 1000,
      cursor,
    },
  });

  if (response.data.response_metadata.next_cursor) {
    return [...response.data.members, ...(await getUsers(response.data.response_metadata.next_cursor))];
  }
  return response.data.members;
}

export async function getCurrentUser(): Promise<{ id: string; name: string; team_id: string }> {
  const response = await axios.get<{ ok: boolean; user_id: string; user: string; team_id: string }>(
    "https://slack.com/api/auth.test",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return { id: response.data.user_id, name: response.data.user, team_id: response.data.team_id };
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
    const infoResponse = await axios.get<GetConversationInfoResponse>("https://slack.com/api/conversations.info", {
      headers: { Authorization: `Bearer ${token}` },
      params: { channel: channelId },
    });
    const ch = infoResponse.data.channel;

    // DMs return unread_count directly
    if (ch.unread_count !== undefined) {
      return { unreadCount: ch.unread_count_display ?? ch.unread_count };
    }

    // For channels: check if there are messages after last_read
    if (!ch.last_read) return { unreadCount: 0 };

    const historyResponse = await axios.get<GetHistoryResponse>("https://slack.com/api/conversations.history", {
      headers: { Authorization: `Bearer ${token}` },
      params: { channel: channelId, oldest: ch.last_read, limit: 100 },
    });

    // Exclude the message at exactly last_read timestamp
    const unread = (historyResponse.data.messages || []).filter((m) => m.ts !== ch.last_read);
    return { unreadCount: unread.length };
  } catch (error) {
    console.error(`[info] Error fetching ${channelId}:`, error);
    return null;
  }
}

export type Conversation = {
  id: string;
  url: string;
  name: string;
  type: "im" | "mpim" | "channel" | "private_channel";
  image: string;
  lastUsed?: number | null;
  topic?: string;
  unreadCount?: number;
};

export async function getData(lastData: Record<string, Conversation> = {}, currentUserId?: string) {
  const [conversations, users] = await Promise.all([getConversations(), getUsers()]);

  const usersMap = users.reduce(
    (acc, user) => {
      acc[user.id] = {
        id: user.id,
        nickname: user.name,
        name: user.real_name || user.profile.real_name,
        image_original: user.profile.image_32,
      };
      acc[user.name] = {
        id: user.id,
        nickname: user.name,
        name: user.real_name || user.profile.real_name,
        image_original: user.profile.image_32,
      };
      return acc;
    },
    {} as Record<string, { nickname: string; name: string; image_original: string; id: string }>,
  );

  const formatMembers = (name_normalized: string) => {
    try {
      const members_names = name_normalized!.match(/mpdm-(.*)-\d*/)?.[1].split("--") || [];
      if (members_names.length > 0) {
        const users = members_names.map((name) => usersMap[name]).filter((user) => !currentUserId || user.id !== currentUserId);
        return users.map((user) => user.name).sort((a, b) => a.localeCompare(b)).join(", ");
      }
    } catch (error) {
      console.error(error);
    }
    return name_normalized;
  };

  const conversationsFormat = conversations.reduce<Record<string, Conversation>>(
    (acc, conversation) => {
      if (conversation.is_user_deleted) {
        return acc;
      }

      if (conversation.is_im) {
        const user = usersMap[conversation.user!];
        if (user) {
          return {
            ...acc,
            [conversation.id]: {
              id: conversation.id,
              url: `slack://channel?team=${conversation.context_team_id}&id=${conversation.id}`,
              name: user.name,
              type: "im",
              image: user.image_original,
              lastUsed: lastData[conversation.id]?.lastUsed || null,
              topic: conversation.topic?.value || undefined,
              unreadCount: lastData[conversation.id]?.unreadCount ?? 0,
            },
          };
        }
        return acc;
      }
      if (conversation.is_channel && !conversation.is_mpim) {
        return {
          ...acc,
          [conversation.id]: {
            id: conversation.id,
            url: `slack://channel?team=${conversation.context_team_id}&id=${conversation.id}`,
            name: conversation.name_normalized!,
            type: conversation.is_private ? "private_channel" : "channel",
            image: conversation.is_private ? Icon.Lock : Icon.Hashtag,
            lastUsed: lastData[conversation.id]?.lastUsed || null,
            topic: conversation.topic?.value || undefined,
            unreadCount: lastData[conversation.id]?.unreadCount ?? 0,
          },
        };
      }
      if (conversation.is_mpim) {
        return {
          ...acc,
          [conversation.id]: {
            id: conversation.id,
            url: `slack://channel?team=${conversation.context_team_id}&id=${conversation.id}`,
            name: formatMembers(conversation.name_normalized!),
            type: "mpim",
            image: Icon.TwoPeople,
            lastUsed: lastData[conversation.id]?.lastUsed || null,
            topic: conversation.topic?.value || undefined,
            unreadCount: lastData[conversation.id]?.unreadCount ?? 0,
          },
        };
      }
      return acc;
    },
    {} as Record<string, Conversation>,
  );

  return {
    stats: {
      conversations: Object.keys(conversationsFormat).length,
      users: users.length,
    },
    conversations: conversationsFormat,
  };
}
