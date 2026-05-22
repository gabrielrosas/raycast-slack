import { dayjs } from "../config/dayjs";
import { getChannelLastRead } from "./api/conversations";

export type RangeType = "24h" | "7d" | "30d" | "unread" | "custom";

export type ComputedRange = { oldest?: string; latest?: string };

export const RANGE_OPTIONS: { value: RangeType; title: string }[] = [
  { value: "unread", title: "Não lidas" },
  { value: "24h", title: "Últimas 24h" },
  { value: "7d", title: "Últimos 7 dias" },
  { value: "30d", title: "Últimos 30 dias" },
  { value: "custom", title: "Customizado" },
];

export function rangeLabelFor(type: RangeType, oldest?: string, latest?: string): string {
  switch (type) {
    case "24h":
      return "últimas 24h";
    case "7d":
      return "últimos 7 dias";
    case "30d":
      return "últimos 30 dias";
    case "unread":
      return "não lidas";
    case "custom":
      if (oldest && latest) {
        return `${dayjs.unix(Number(oldest)).format("DD/MM/YYYY")} → ${dayjs.unix(Number(latest)).format("DD/MM/YYYY")}`;
      }
      return "customizado";
  }
}

export async function computeRange(
  type: RangeType,
  channelId: string,
  oldestDate?: Date,
  latestDate?: Date,
): Promise<ComputedRange> {
  switch (type) {
    case "24h":
      return { oldest: String(dayjs().subtract(24, "hour").unix()) };
    case "7d":
      return { oldest: String(dayjs().subtract(7, "day").unix()) };
    case "30d":
      return { oldest: String(dayjs().subtract(30, "day").unix()) };
    case "unread": {
      const lastRead = await getChannelLastRead(channelId);
      return lastRead ? { oldest: lastRead } : {};
    }
    case "custom":
      return {
        oldest: oldestDate ? String(dayjs(oldestDate).unix()) : undefined,
        latest: latestDate ? String(dayjs(latestDate).unix()) : undefined,
      };
  }
}
