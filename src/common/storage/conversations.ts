import { LocalStorage } from "@raycast/api";
import { Conversation } from "../api/types";

const KEY = "conversations";

export async function loadConversations(): Promise<Record<string, Conversation>> {
  try {
    const json = await LocalStorage.getItem<string>(KEY);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    console.error(error);
    return {};
  }
}

export async function saveConversations(conversations: Record<string, Conversation>): Promise<void> {
  try {
    await LocalStorage.setItem(KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error(error);
  }
}
