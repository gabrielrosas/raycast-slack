import { updateCommandMetadata, environment, LaunchType, showHUD, LocalStorage } from "@raycast/api";

import { dayjs } from "./config/dayjs";
import { getData, getCurrentUser } from "./common/requests";

export default async function main() {
  console.log("launchType", environment.launchType);

  const [lastData, currentUser] = await Promise.all([
    LocalStorage.getItem<string>("conversations"),
    getCurrentUser(),
  ]);

  await LocalStorage.setItem("currentUser", JSON.stringify(currentUser));

  const { stats, conversations } = await getData(lastData ? JSON.parse(lastData) : {}, currentUser.id);

  await updateCommandMetadata({
    subtitle: `🕓 ${dayjs().format("DD/MM/YYYY HH:mm")} - ${stats.conversations} conversations - ${stats.users} users`,
  });

  console.log(stats);

  await LocalStorage.setItem("conversations", JSON.stringify(conversations));

  if (environment.launchType === LaunchType.UserInitiated) {
    await showHUD(`Slack sync - ${stats.conversations} conversations - ${stats.users} users`, {
      clearRootSearch: true,
    });
  }
}
