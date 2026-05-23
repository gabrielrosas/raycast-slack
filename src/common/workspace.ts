import { LocalStorage } from "@raycast/api";
import { getCurrentUser } from "./api/users";
import { loadCurrentUser } from "./storage/current-user";

const HTTPS_PERMALINK = /^(https?:\/\/[a-z0-9-]+\.slack\.com\/)/i;
const RAYCAST_AUTHOR = "gabriel-rosas";

export async function resolveWorkspaceUrl(originalUrl?: string): Promise<string | undefined> {
  if (originalUrl) {
    const match = originalUrl.match(HTTPS_PERMALINK);
    if (match) return match[1];
  }

  const cached = await loadCurrentUser();
  if (cached?.url) return cached.url;

  try {
    const fresh = await getCurrentUser();
    if (fresh.url) {
      const merged = { ...(cached ?? {}), ...fresh };
      await LocalStorage.setItem("currentUser", JSON.stringify(merged));
      return fresh.url;
    }
  } catch (error) {
    console.error("[workspace] auth.test failed", error);
  }

  return undefined;
}

export function messagePermalink(workspaceUrl: string, channelId: string, ts: string): string {
  const compact = ts.replace(".", "");
  return `${workspaceUrl}archives/${channelId}/p${compact}`;
}

export function showMessagesQuicklink(slackPermalink: string): string {
  const ctx = encodeURIComponent(JSON.stringify({ url: slackPermalink }));
  return `raycast://extensions/${RAYCAST_AUTHOR}/slack/messages?launchContext=${ctx}`;
}
