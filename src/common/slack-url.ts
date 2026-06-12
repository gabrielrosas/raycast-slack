export type ParsedThreadUrl = {
  kind: "thread";
  channelId: string;
  ts: string;
  threadTs: string;
  workspace: string;
  originalUrl: string;
};

export type ParsedChannelUrl = {
  kind: "channel";
  channelId: string;
  workspace: string;
  originalUrl: string;
};

export type ParsedSlackUrl = ParsedThreadUrl | ParsedChannelUrl;

const THREAD_PATTERN = /^https?:\/\/([a-z0-9-]+)\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)(?:\?(.*))?$/i;
const CHANNEL_PATTERN = /^https?:\/\/([a-z0-9-]+)\.slack\.com\/archives\/([A-Z0-9]+)\/?(?:\?.*)?$/i;
const BARE_ID_PATTERN = /^([CDG][A-Z0-9]+)$/i;

function expandTs(compact: string): string | null {
  if (compact.length < 7) return null;
  const seconds = compact.slice(0, compact.length - 6);
  const micro = compact.slice(-6);
  return `${seconds}.${micro}`;
}

export function parseSlackMessageUrl(input: string | null | undefined): ParsedSlackUrl | null {
  if (!input) return null;
  const trimmed = input.trim();

  const threadMatch = trimmed.match(THREAD_PATTERN);
  if (threadMatch) {
    const [, workspace, channelId, compactTs, query] = threadMatch;
    const ts = expandTs(compactTs);
    if (!ts) return null;

    let threadTs = ts;
    if (query) {
      const params = new URLSearchParams(query);
      const qThreadTs = params.get("thread_ts");
      if (qThreadTs) threadTs = qThreadTs;
    }

    return { kind: "thread", workspace, channelId, ts, threadTs, originalUrl: trimmed };
  }

  const channelMatch = trimmed.match(CHANNEL_PATTERN);
  if (channelMatch) {
    const [, workspace, channelId] = channelMatch;
    return { kind: "channel", workspace, channelId, originalUrl: trimmed };
  }

  const idMatch = trimmed.match(BARE_ID_PATTERN);
  if (idMatch) {
    const channelId = idMatch[1].toUpperCase();
    return {
      kind: "channel",
      workspace: "",
      channelId,
      originalUrl: `slack://channel?id=${channelId}`,
    };
  }

  return null;
}
