import { updateCommandMetadata, environment, LaunchType, showHUD, LocalStorage } from "@raycast/api";

import { dayjs } from "./config/dayjs";
import { getData } from "./common/api/data";
import { getCurrentUser } from "./common/api/users";
import { getConversationUnreadCount } from "./common/api/conversations";
import { getFollowed, getIgnored, getTrackedIds } from "./common/storage/follows";

export default async function main() {
  console.log("launchType", environment.launchType);

  const [lastData, currentUser, followed, ignored] = await Promise.all([
    LocalStorage.getItem<string>("conversations"),
    getCurrentUser(),
    getFollowed(),
    getIgnored(),
  ]);

  await LocalStorage.setItem("currentUser", JSON.stringify(currentUser));

  const { stats, conversations, users } = await getData(lastData ? JSON.parse(lastData) : {}, currentUser.id);

  await LocalStorage.setItem("users", JSON.stringify(users));

  // Determine which conversations to check for unread
  const trackedIds = getTrackedIds(conversations, followed, ignored);
  console.log(`[sync] Checking ${trackedIds.length} conversations for unread`);

  // Fetch unread count for tracked conversations
  const results = await Promise.all(
    trackedIds.map(async (id) => {
      const info = await getConversationUnreadCount(id);
      return { id, info };
    }),
  );

  // Update unread counts
  let totalUnread = 0;
  for (const { id, info } of results) {
    if (!info || !conversations[id]) continue;
    conversations[id].unreadCount = info.unreadCount;
    if (info.unreadCount > 0) totalUnread++;
  }

  await updateCommandMetadata({
    subtitle: `🕓 ${dayjs().format("DD/MM/YYYY HH:mm")} - ${stats.conversations} conversations - ${stats.users} users`,
  });

  console.log({ ...stats, unread: totalUnread, tracked: trackedIds.length });

  await LocalStorage.setItem("conversations", JSON.stringify(conversations));

  if (environment.launchType === LaunchType.UserInitiated) {
    await showHUD(`Slack sync - ${stats.conversations} conversations - ${stats.users} users - ${totalUnread} unread`, {
      clearRootSearch: true,
    });
  }
}
