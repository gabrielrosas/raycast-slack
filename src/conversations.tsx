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
} from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { usePromise } from "@raycast/utils";
import { Conversation } from "./common/requests";
import { Tag, getTags, getConversationTags, toggleTagOnConversation } from "./common/tags";
import { getFollowed, toggleFollow, getIgnored, toggleIgnore } from "./common/follows";
import { useCallback, useEffect, useMemo, useState } from "react";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scoreMatch(query: string, conversation: Conversation, tagNames: string[]): number {
  if (!query) return 0;

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const fields = [conversation.name, conversation.topic || "", ...tagNames].map(normalize);
  const joined = fields.join(" ");

  let score = 0;

  for (const term of terms) {
    const found = fields.some((f) => f.includes(term));
    if (!found) return -1;

    if (fields.some((f) => f.startsWith(term))) score += 3;
    else if (fields.some((f) => f.split(/[\s,]+/).some((word) => word.startsWith(term)))) score += 2;
    else score += 1;
  }

  if (normalize(conversation.name).startsWith(normalize(query))) score += 5;
  if (joined.includes(normalize(query))) score += 2;

  return score;
}

async function getConversations(): Promise<Record<string, Conversation>> {
  try {
    const conversationsJson = await LocalStorage.getItem<string>("conversations");
    return (conversationsJson ? JSON.parse(conversationsJson) : {}) as Record<string, Conversation>;
  } catch (error) {
    console.error(error);
    return {};
  }
}

async function setLastUsed(conversation: Conversation, conversations: Record<string, Conversation>) {
  conversations[conversation.id].lastUsed = Date.now();
  conversations[conversation.id].unreadCount = 0;
  await LocalStorage.setItem("conversations", JSON.stringify(conversations));
  return conversations;
}

async function openConversation(conversation: Conversation) {
  await runAppleScript(`do shell script "open '${conversation.url}'"`).then((res) => {
    console.log("openConversation", res);
  });
}

function MpimDetail({ conversation }: { conversation: Conversation }) {
  const members = conversation.name.split(", ").filter(Boolean);
  return <List.Item.Detail markdown={`## Members (${members.length})\n${members.map((m) => `- ${m}`).join("\n")}`} />;
}

type ConversationItemProps = {
  conversation: Conversation;
  showDetail: boolean;
  setShowDetail: (v: boolean) => void;
  convTags: Record<string, string[]>;
  tagsById: Record<string, Tag>;
  allTags: Tag[];
  isFollowed: boolean;
  isIgnored: boolean;
  onOpen: (conversation: Conversation, notClose?: boolean) => void;
  onToggleTag: (conversationId: string, tagId: string) => void;
  onToggleFollow: (conversationId: string) => void;
  onToggleIgnore: (conversationId: string) => void;
};

function ConversationItem({ conversation, showDetail, setShowDetail, convTags, tagsById, allTags, isFollowed, isIgnored, onOpen, onToggleTag, onToggleFollow, onToggleIgnore }: ConversationItemProps) {
  return (
    <List.Item
      title={conversation.type === "mpim" && conversation.topic ? conversation.topic : conversation.name}
      subtitle={!showDetail && conversation.type === "mpim" && conversation.topic ? conversation.name : undefined}
      icon={{
        source: conversation.image,
        ...(conversation.type === "im" && { mask: Image.Mask.Circle }),
        ...(conversation.type === "channel" && { tintColor: Color.Blue }),
        ...(conversation.type === "private_channel" && { tintColor: Color.Red }),
        ...(conversation.type === "mpim" && { tintColor: Color.Yellow }),
      }}
      accessories={showDetail ? [] : [
        ...(isFollowed ? [{ icon: { source: Icon.Eye, tintColor: Color.Green } }] : []),
        ...(isIgnored ? [{ icon: { source: Icon.EyeDisabled, tintColor: Color.SecondaryText } }] : []),
        ...(convTags[conversation.id] || [])
          .map((id) => tagsById[id])
          .filter(Boolean)
          .map((tag) => ({ tag: { value: tag.name, color: tag.color } })),
      ]}
      detail={showDetail && conversation.type === "mpim" ? <MpimDetail conversation={conversation} /> : undefined}
      actions={
        <ActionPanel>
          <Action title="Ir" icon={Icon.ArrowNe} onAction={() => onOpen(conversation)} />
          <Action title="Ver" icon={Icon.Eye} shortcut={{ modifiers: ["opt"], key: "return" }} onAction={() => onOpen(conversation, true)} />
          <Action title={showDetail ? "Hide Members" : "Show Members"} icon={Icon.Sidebar} onAction={() => setShowDetail(!showDetail)} shortcut={{ modifiers: ["opt"], key: "d" }} />
          <Action
            title={isFollowed ? "Unfollow" : "Follow"}
            icon={isFollowed ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["opt"], key: "f" }}
            onAction={() => onToggleFollow(conversation.id)}
          />
          <Action
            title={isIgnored ? "Unignore" : "Ignore"}
            icon={isIgnored ? Icon.Undo : Icon.XMarkCircle}
            shortcut={{ modifiers: ["opt"], key: "i" }}
            onAction={() => onToggleIgnore(conversation.id)}
          />
          {allTags.length > 0 && (
            <ActionPanel.Submenu title="Tags" icon={Icon.Tag} shortcut={{ modifiers: ["opt", "shift"], key: "t" }}>
              {allTags.map((tag) => {
                const isActive = (convTags[conversation.id] || []).includes(tag.id);
                return (
                  <Action
                    key={tag.id}
                    title={`${isActive ? "Remove" : "Add"} "${tag.name}"`}
                    icon={{ source: isActive ? Icon.CheckCircle : Icon.Circle, tintColor: tag.color }}
                    onAction={() => onToggleTag(conversation.id, tag.id)}
                  />
                );
              })}
            </ActionPanel.Submenu>
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { data, isLoading } = usePromise(getConversations);
  const [state, setState] = useState<Record<string, Conversation>>();
  const [search, setSearch] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const { data: allTags } = usePromise(getTags);
  const [convTags, setConvTags] = useState<Record<string, string[]>>({});
  const [filter, setFilter] = useState("all");
  const [followed, setFollowed] = useState<string[]>([]);
  const [ignored, setIgnored] = useState<string[]>([]);

  useEffect(() => {
    getConversationTags().then(setConvTags);
    getFollowed().then(setFollowed);
    getIgnored().then(setIgnored);
  }, []);

  const handlerOpenConversation = useCallback(
    async (conversation: Conversation, notCloseMainWindow = false) => {
      setState(await setLastUsed(conversation, state || {}));
      await openConversation(conversation);
      if (!notCloseMainWindow) {
        closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      } else {
        closeMainWindow({ popToRootType: PopToRootType.Suspended });
      }
    },
    [state, setState],
  );

  useEffect(() => {
    if (data) {
      setState(data);
    }
  }, [data]);

  const tagsById = useMemo(() => {
    const map: Record<string, Tag> = {};
    for (const tag of allTags || []) map[tag.id] = tag;
    return map;
  }, [allTags]);

  const getTagNames = useCallback(
    (conversationId: string) => (convTags[conversationId] || []).map((id) => tagsById[id]?.name).filter(Boolean),
    [convTags, tagsById],
  );

  const handleToggleTag = useCallback(
    async (conversationId: string, tagId: string) => {
      setConvTags(await toggleTagOnConversation(conversationId, tagId));
    },
    [],
  );

  const handleToggleFollow = useCallback(
    async (conversationId: string) => {
      setFollowed(await toggleFollow(conversationId));
    },
    [],
  );

  const handleToggleIgnore = useCallback(
    async (conversationId: string) => {
      setIgnored(await toggleIgnore(conversationId));
    },
    [],
  );

  const conversations = useMemo(() => {
    if (!state) return null;

    const all = Object.values(state).sort((a, b) => {
      if (!a.lastUsed && !b.lastUsed) return 0;
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return b.lastUsed - a.lastUsed;
    });

    const filtered = filter === "all" ? all : all.filter((c) => (convTags[c.id] || []).includes(filter));

    if (!search) return filtered;

    return filtered
      .map((c) => ({ conversation: c, score: scoreMatch(search, c, getTagNames(c.id)) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.conversation);
  }, [state, search, getTagNames, filter, convTags]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search conversations..."
      onSearchTextChange={setSearch}
      searchBarAccessory={
        allTags && allTags.length > 0 ? (
          <List.Dropdown tooltip="Filter by tag" onChange={setFilter} value={filter}>
            <List.Dropdown.Item title="All" value="all" />
            <List.Dropdown.Section title="Tags">
              {allTags.map((tag) => (
                <List.Dropdown.Item key={tag.id} title={tag.name} value={tag.id} icon={{ source: Icon.Tag, tintColor: tag.color }} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {conversations?.map((conversation) => (
        <ConversationItem key={conversation.id} conversation={conversation} showDetail={showDetail} setShowDetail={setShowDetail} convTags={convTags} tagsById={tagsById} allTags={allTags || []} isFollowed={followed.includes(conversation.id)} isIgnored={ignored.includes(conversation.id)} onOpen={handlerOpenConversation} onToggleTag={handleToggleTag} onToggleFollow={handleToggleFollow} onToggleIgnore={handleToggleIgnore} />
      ))}
    </List>
  );
}
