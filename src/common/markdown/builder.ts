import { dayjs } from "../../config/dayjs";
import type { SlackMessage, UserInfo } from "../api/types";
import { mrkdwnToMarkdown } from "./mrkdwn";
import { blocksToMarkdown, hasRichText } from "./blocks";
import { renderEmojiName } from "./emoji";

const SKIP_SUBTYPES = new Set(["channel_join", "channel_leave", "tombstone"]);

function formatTs(ts: string): string {
  const seconds = Number(ts.split(".")[0]);
  if (!Number.isFinite(seconds)) return ts;
  return dayjs.unix(seconds).format("DD/MM/YYYY HH:mm");
}

function authorName(message: SlackMessage, users: Record<string, UserInfo>): string {
  if (message.user && users[message.user]) return users[message.user].name;
  if (message.username) return message.username;
  if (message.bot_id) return `bot:${message.bot_id}`;
  if (message.user) return message.user;
  return "unknown";
}

function formatReactions(message: SlackMessage): string | null {
  if (!message.reactions?.length) return null;
  return message.reactions.map((r) => `\`${renderEmojiName(r.name)} x${r.count}\``).join(" ");
}

function formatFiles(message: SlackMessage): string | null {
  if (!message.files?.length) return null;
  const lines = message.files
    .map((f) => {
      const name = f.name ?? "file";
      const url = f.permalink ?? f.url_private;
      return url ? `- [${name}](${url})` : `- ${name}`;
    })
    .join("\n");
  return `**Arquivos:**\n${lines}`;
}

function channelLabel(channelName: string, channelIsPrivate?: boolean): string {
  return channelIsPrivate ? `🔒 ${channelName}` : `#${channelName}`;
}

function renderMessage(
  m: SlackMessage,
  users: Record<string, UserInfo>,
  userResolver: (id: string) => string | undefined,
  options: { showThreadIndicator?: boolean } = {},
): string {
  const author = authorName(m, users);
  const date = formatTs(m.ts);
  const text = (
    hasRichText(m.blocks) ? blocksToMarkdown(m.blocks, userResolver) : mrkdwnToMarkdown(m.text, userResolver)
  ).trim();
  const reactions = formatReactions(m);
  const files = formatFiles(m);

  const headerExtra = options.showThreadIndicator && (m.reply_count ?? 0) > 0 ? ` · 💬 ${m.reply_count} respostas` : "";

  const parts = [`**${author}** · ${date}${headerExtra}`, "", text || "_(sem texto)_"];
  if (files) parts.push("", files);
  if (reactions) parts.push("", reactions);
  return parts.join("\n");
}

export type BuildThreadInput = {
  messages: SlackMessage[];
  channelName: string;
  channelIsPrivate?: boolean;
  originalUrl: string;
  users: Record<string, UserInfo>;
};

export function buildThreadMarkdown({
  messages,
  channelName,
  channelIsPrivate,
  originalUrl,
  users,
}: BuildThreadInput): string {
  const visible = messages.filter((m) => !m.subtype || !SKIP_SUBTYPES.has(m.subtype));
  const userResolver = (id: string) => users[id]?.name;

  const first = visible[0];
  const firstDate = first ? formatTs(first.ts) : "";

  const header = [
    `# Thread em ${channelLabel(channelName, channelIsPrivate)}`,
    "",
    `> Link original: ${originalUrl}`,
    `> ${visible.length} mensagens · ${firstDate}`,
    "",
    "---",
    "",
  ].join("\n");

  const body = visible.map((m) => renderMessage(m, users, userResolver)).join("\n\n---\n\n");

  return `${header}${body}\n`;
}

export type BuildChannelInput = {
  messages: SlackMessage[];
  channelName: string;
  channelIsPrivate?: boolean;
  originalUrl: string;
  users: Record<string, UserInfo>;
  rangeLabel: string;
  truncated: boolean;
};

export function buildChannelMarkdown({
  messages,
  channelName,
  channelIsPrivate,
  originalUrl,
  users,
  rangeLabel,
  truncated,
}: BuildChannelInput): string {
  const visible = messages
    .filter((m) => !m.subtype || !SKIP_SUBTYPES.has(m.subtype))
    .slice()
    .sort((a, b) => Number(a.ts) - Number(b.ts));
  const userResolver = (id: string) => users[id]?.name;

  const headerLines = [
    `# Mensagens de ${channelLabel(channelName, channelIsPrivate)}`,
    "",
    `> Link original: ${originalUrl}`,
    `> Range: ${rangeLabel}`,
    `> ${visible.length} mensagens`,
  ];
  if (truncated) {
    headerLines.push(
      `> ⚠️ Truncado em ${visible.length} mensagens. Existem mais nesse range — refine o filtro pra ver o resto.`,
    );
  }
  headerLines.push("", "---", "");
  const header = headerLines.join("\n");

  const body = visible
    .map((m) => renderMessage(m, users, userResolver, { showThreadIndicator: true }))
    .join("\n\n---\n\n");

  return `${header}${body}\n`;
}
