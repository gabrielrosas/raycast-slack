import { runAppleScript } from "run-applescript";
import { closeMainWindow, PopToRootType } from "@raycast/api";

export async function openSlackUnreads() {
  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  await runAppleScript(`
    tell application "Slack" to activate
    delay 1
    tell application "System Events" to tell process "Slack"
      set frontmost to true
      delay 0.3
      key code 0 using {command down, shift down}
    end tell
  `);
}
