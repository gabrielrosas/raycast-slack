import { LocalStorage } from "@raycast/api";

export type CachedCurrentUser = { id: string; name: string; team_id: string; url?: string };

export async function loadCurrentUser(): Promise<CachedCurrentUser | null> {
  try {
    const json = await LocalStorage.getItem<string>("currentUser");
    return json ? (JSON.parse(json) as CachedCurrentUser) : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}
