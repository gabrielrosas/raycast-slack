import {
  Image,
  List,
  LocalStorage,
  Color,
  ActionPanel,
  Action,
  Icon,
  closeMainWindow,
  PopToRootType,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { usePromise } from "@raycast/utils";
import { Conversation, getConversationUnreadCount } from "./common/requests";
import { toggleIgnore, toggleFollow, getFollowed, getIgnored, getTrackedIds } from "./common/follows";
import { useCallback, useEffect, useMemo, useState } from "react";

async function loadConversations(): Promise<Record<string, Conversation>> {
  try {
    const json = await LocalStorage.getItem<string>("conversations");
    return (json ? JSON.parse(json) : {}) as Record<string, Conversation>;
  } catch (error) {
    console.error(error);
    return {};
  }
}

async function openConversation(conversation: Conversation) {
  await runAppleScript(`do shell script "open '${conversation.url}'"`);
}

export default function Command() {
  const { data, isLoading } = usePromise(loadConversations);
  const [state, setState] = useState<Record<string, Conversation>>();
  const [followed, setFollowed] = useState<string[]>([]);

  useEffect(() => {
    if (data) setState(data);
    getFollowed().then(setFollowed);
  }, [data]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!state) return;
    setIsRefreshing(true);
    const [followedIds, ignoredIds] = await Promise.all([getFollowed(), getIgnored()]);
    const trackedIds = getTrackedIds(state, followedIds, ignoredIds);

    const results = await Promise.all(
      trackedIds.map(async (id) => {
        const info = await getConversationUnreadCount(id);
        return { id, info };
      }),
    );

    for (const { id, info } of results) {
      if (!info || !state[id]) continue;
      state[id].unreadCount = info.unreadCount;
    }

    await LocalStorage.setItem("conversations", JSON.stringify(state));
    setState({ ...state });
    setIsRefreshing(false);
  }, [state]);

  const handleFollowFromClipboard = useCallback(async () => {
    const text = await Clipboard.readText();
    const id = text?.trim();
    if (!id || !state?.[id]) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid conversation ID" });
      return;
    }
    if (followed.includes(id)) {
      await showToast({ style: Toast.Style.Failure, title: "Already following", message: state[id].name });
      return;
    }
    setFollowed(await toggleFollow(id));
    await showToast({ style: Toast.Style.Success, title: "Following", message: state[id].name });
  }, [state, followed]);

  const handleOpen = useCallback(
    async (conversation: Conversation) => {
      if (state) {
        state[conversation.id].unreadCount = 0;
        state[conversation.id].lastUsed = Date.now();
        await LocalStorage.setItem("conversations", JSON.stringify(state));
        setState({ ...state });
      }
      await openConversation(conversation);
      closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    },
    [state],
  );

  const handleMarkAsRead = useCallback(
    async (conversationId: string) => {
      if (state) {
        state[conversationId].unreadCount = 0;
        await LocalStorage.setItem("conversations", JSON.stringify(state));
        setState({ ...state });
      }
    },
    [state],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (state) {
      for (const conv of Object.values(state)) {
        conv.unreadCount = 0;
      }
      await LocalStorage.setItem("conversations", JSON.stringify(state));
      setState({ ...state });
    }
  }, [state]);

  const { followedConvs, unreadConvs } = useMemo(() => {
    if (!state) return { followedConvs: [], unreadConvs: [] };

    const followedSet = new Set(followed);
    const all = Object.values(state);

    const followedConvs = all
      .filter((c) => followedSet.has(c.id))
      .sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));

    const unreadConvs = all
      .filter((c) => !followedSet.has(c.id) && (c.unreadCount || 0) > 0)
      .sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));

    return { followedConvs, unreadConvs };
  }, [state, followed]);

  const isEmpty = followedConvs.length === 0 && unreadConvs.length === 0;

  return (
    <List isLoading={isLoading || isRefreshing} searchBarPlaceholder="Search unread conversations...">
      {isEmpty && (
        <List.EmptyView
          title="Nenhuma conversa não lida"
          description="Tudo em dia!"
          actions={
            <ActionPanel>
              <Action title="Follow from Clipboard" icon={Icon.Clipboard} shortcut={{ modifiers: ["opt", "shift"], key: "f" }} onAction={handleFollowFromClipboard} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={handleRefresh} />
            </ActionPanel>
          }
        />
      )}
      {followedConvs.length > 0 && (
        <List.Section title="Following">
          {followedConvs.map((conversation) => (
            <UnreadItem
              key={conversation.id}
              conversation={conversation}
              isFollowed={true}
              followed={followed}
              onOpen={handleOpen}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllRead={handleMarkAllRead}
              onToggleFollow={async (id) => setFollowed(await toggleFollow(id))}
              onToggleIgnore={async (id) => { await toggleIgnore(id); await handleMarkAsRead(id); }}
              onRefresh={handleRefresh}
              onFollowFromClipboard={handleFollowFromClipboard}
            />
          ))}
        </List.Section>
      )}
      {unreadConvs.length > 0 && (
        <List.Section title="Unread">
          {unreadConvs.map((conversation) => (
            <UnreadItem
              key={conversation.id}
              conversation={conversation}
              isFollowed={false}
              followed={followed}
              onOpen={handleOpen}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllRead={handleMarkAllRead}
              onToggleFollow={async (id) => setFollowed(await toggleFollow(id))}
              onToggleIgnore={async (id) => { await toggleIgnore(id); await handleMarkAsRead(id); }}
              onRefresh={handleRefresh}
              onFollowFromClipboard={handleFollowFromClipboard}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

type UnreadItemProps = {
  conversation: Conversation;
  isFollowed: boolean;
  followed: string[];
  onOpen: (conversation: Conversation) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onToggleFollow: (id: string) => void;
  onToggleIgnore: (id: string) => void;
  onRefresh: () => void;
  onFollowFromClipboard: () => void;
};

function UnreadItem({ conversation, isFollowed, onOpen, onMarkAsRead, onMarkAllRead, onToggleFollow, onToggleIgnore, onRefresh, onFollowFromClipboard }: UnreadItemProps) {
  const count = conversation.unreadCount || 0;

  return (
    <List.Item
      title={conversation.type === "mpim" && conversation.topic ? conversation.topic : conversation.name}
      subtitle={conversation.type === "mpim" && conversation.topic ? conversation.name : undefined}
      icon={{
        source: conversation.image,
        ...(conversation.type === "im" && { mask: Image.Mask.Circle }),
        ...(conversation.type === "channel" && { tintColor: Color.Blue }),
        ...(conversation.type === "private_channel" && { tintColor: Color.Red }),
        ...(conversation.type === "mpim" && { tintColor: Color.Yellow }),
      }}
      accessories={[
        ...(count > 0 ? [{ text: { value: `${count}`, color: Color.Red } }] : [{ text: "0" }]),
        ...(isFollowed ? [{ icon: { source: Icon.Eye, tintColor: Color.Green } }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action title="Open" icon={Icon.ArrowNe} onAction={() => onOpen(conversation)} />
          <Action title="Mark as Read" icon={Icon.Check} shortcut={{ modifiers: ["opt"], key: "r" }} onAction={() => onMarkAsRead(conversation.id)} />
          <Action title="Mark All as Read" icon={Icon.CheckCircle} shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} onAction={onMarkAllRead} />
          <Action
            title={isFollowed ? "Unfollow" : "Follow"}
            icon={isFollowed ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["opt"], key: "f" }}
            onAction={() => onToggleFollow(conversation.id)}
          />
          <Action title="Ignore" icon={Icon.XMarkCircle} shortcut={{ modifiers: ["opt"], key: "i" }} onAction={() => onToggleIgnore(conversation.id)} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={onRefresh} />
          <Action title="Follow from Clipboard" icon={Icon.Clipboard} shortcut={{ modifiers: ["opt", "shift"], key: "f" }} onAction={onFollowFromClipboard} />
        </ActionPanel>
      }
    />
  );
}
