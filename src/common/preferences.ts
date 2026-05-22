import { getPreferenceValues } from "@raycast/api";

export function getDefaultLanguage(): string {
  const prefs = getPreferenceValues<{ defaultLanguage?: string }>();
  return prefs.defaultLanguage ?? "Portuguese (Brazil)";
}
