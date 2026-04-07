import { LocalStorage, Color } from "@raycast/api";

export type Tag = {
  id: string;
  name: string;
  color: Color;
};

const TAGS_KEY = "tags";
const CONVERSATION_TAGS_KEY = "conversation_tags";

export const TAG_COLORS: { name: string; value: Color }[] = [
  { name: "Blue", value: Color.Blue },
  { name: "Green", value: Color.Green },
  { name: "Red", value: Color.Red },
  { name: "Yellow", value: Color.Yellow },
  { name: "Purple", value: Color.Purple },
  { name: "Orange", value: Color.Orange },
  { name: "Magenta", value: Color.Magenta },
];

export async function getTags(): Promise<Tag[]> {
  const json = await LocalStorage.getItem<string>(TAGS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveTags(tags: Tag[]): Promise<void> {
  await LocalStorage.setItem(TAGS_KEY, JSON.stringify(tags));
}

export async function getConversationTags(): Promise<Record<string, string[]>> {
  const json = await LocalStorage.getItem<string>(CONVERSATION_TAGS_KEY);
  return json ? JSON.parse(json) : {};
}

export async function saveConversationTags(mapping: Record<string, string[]>): Promise<void> {
  await LocalStorage.setItem(CONVERSATION_TAGS_KEY, JSON.stringify(mapping));
}

export async function toggleTagOnConversation(conversationId: string, tagId: string): Promise<Record<string, string[]>> {
  const mapping = await getConversationTags();
  const current = mapping[conversationId] || [];

  if (current.includes(tagId)) {
    mapping[conversationId] = current.filter((id) => id !== tagId);
  } else {
    mapping[conversationId] = [...current, tagId];
  }

  await saveConversationTags(mapping);
  return mapping;
}

export async function deleteTag(tagId: string): Promise<void> {
  const [tags, mapping] = await Promise.all([getTags(), getConversationTags()]);

  await saveTags(tags.filter((t) => t.id !== tagId));

  for (const convId of Object.keys(mapping)) {
    mapping[convId] = mapping[convId].filter((id) => id !== tagId);
  }
  await saveConversationTags(mapping);
}
