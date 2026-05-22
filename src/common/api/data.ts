import { Icon } from "@raycast/api";
import { getConversations } from "./conversations";
import { buildUserDirectory, getUsers } from "./users";
import { Conversation, UserInfo } from "./types";

export async function getData(lastData: Record<string, Conversation> = {}, currentUserId?: string) {
  const [conversations, users] = await Promise.all([getConversations(), getUsers()]);

  const userDirectory = buildUserDirectory(users);
  const byNickname: Record<string, UserInfo> = {};
  for (const u of Object.values(userDirectory)) byNickname[u.nickname] = u;

  const formatMembers = (name_normalized: string) => {
    try {
      const members_names = name_normalized!.match(/mpdm-(.*)-\d*/)?.[1].split("--") || [];
      if (members_names.length > 0) {
        const members = members_names
          .map((name) => byNickname[name])
          .filter((user) => user && (!currentUserId || user.id !== currentUserId));
        return members
          .map((user) => user.name)
          .sort((a, b) => a.localeCompare(b))
          .join(", ");
      }
    } catch (error) {
      console.error(error);
    }
    return name_normalized;
  };

  const conversationsFormat = conversations.reduce<Record<string, Conversation>>((acc, conversation) => {
    if (conversation.is_user_deleted) return acc;

    const baseUrl = `slack://channel?team=${conversation.context_team_id}&id=${conversation.id}`;
    const lastUsed = lastData[conversation.id]?.lastUsed || null;
    const topic = conversation.topic?.value || undefined;
    const unreadCount = lastData[conversation.id]?.unreadCount ?? 0;

    if (conversation.is_im) {
      const user = userDirectory[conversation.user!];
      if (!user) return acc;
      return {
        ...acc,
        [conversation.id]: {
          id: conversation.id,
          url: baseUrl,
          name: user.name,
          type: "im",
          image: user.image,
          lastUsed,
          topic,
          unreadCount,
        },
      };
    }

    if (conversation.is_channel && !conversation.is_mpim) {
      return {
        ...acc,
        [conversation.id]: {
          id: conversation.id,
          url: baseUrl,
          name: conversation.name_normalized!,
          type: conversation.is_private ? "private_channel" : "channel",
          image: conversation.is_private ? Icon.Lock : Icon.Hashtag,
          lastUsed,
          topic,
          unreadCount,
        },
      };
    }

    if (conversation.is_mpim) {
      return {
        ...acc,
        [conversation.id]: {
          id: conversation.id,
          url: baseUrl,
          name: formatMembers(conversation.name_normalized!),
          type: "mpim",
          image: Icon.TwoPeople,
          lastUsed,
          topic,
          unreadCount,
        },
      };
    }

    return acc;
  }, {});

  return {
    stats: {
      conversations: Object.keys(conversationsFormat).length,
      users: users.length,
    },
    conversations: conversationsFormat,
    users: userDirectory,
  };
}
