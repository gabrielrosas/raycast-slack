import { LocalStorage } from "@raycast/api";
import { UserInfo } from "../api/types";

const KEY = "users";

export async function loadUserDirectory(): Promise<Record<string, UserInfo>> {
  try {
    const json = await LocalStorage.getItem<string>(KEY);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    console.error(error);
    return {};
  }
}

export async function saveUserDirectory(directory: Record<string, UserInfo>): Promise<void> {
  try {
    await LocalStorage.setItem(KEY, JSON.stringify(directory));
  } catch (error) {
    console.error(error);
  }
}
