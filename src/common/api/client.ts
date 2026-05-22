import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

const { token } = getPreferenceValues<{ token: string }>();

export const slackAxios = axios.create({
  baseURL: "https://slack.com/api",
  headers: { Authorization: `Bearer ${token}` },
});

export class SlackApiError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "SlackApiError";
  }
}
