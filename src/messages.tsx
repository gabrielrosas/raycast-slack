import { Action, ActionPanel, Clipboard, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { SlackApiError } from "./common/api/client";
import { fetchAndBuildThread } from "./common/flows";
import { ParsedChannelUrl, ParsedSlackUrl, ParsedThreadUrl, parseSlackMessageUrl } from "./common/slack-url";
import MessagesDetail from "./components/messages-detail";
import RangeForm from "./components/range-form";

const ERROR_HINTS: Record<string, string> = {
  not_in_channel: "Você não é membro deste canal.",
  channel_not_found: "Canal não encontrado ou sem acesso.",
  thread_not_found: "Essa mensagem não inicia uma thread.",
  missing_scope: "Falta um scope no token (channels:history, groups:history, im:history, mpim:history).",
  invalid_auth: "Token inválido ou expirado.",
  ratelimited: "Rate limit do Slack atingido. Tente em alguns segundos.",
};

const EMPTY_MARKDOWN = `# Slack Show Messages

Copie a URL de uma thread OU de um canal do Slack (clique direito → **Copy link**) e abra este comando novamente.

Formatos esperados:
- Thread: \`https://{workspace}.slack.com/archives/{C…}/p…\`
- Canal: \`https://{workspace}.slack.com/archives/{C…}\`

Alternativa: abra **Slack Conversations**, selecione um canal e use a ação **Show Messages**.
`;

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "thread"; parsed: ParsedThreadUrl; markdown: string }
  | { kind: "channel"; parsed: ParsedChannelUrl }
  | { kind: "error"; message: string; parsed?: ParsedSlackUrl };

export default function Command() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = async () => {
    setState({ kind: "loading" });
    const clipboard = await Clipboard.readText();
    const parsed = parseSlackMessageUrl(clipboard ?? "");
    if (!parsed) return setState({ kind: "empty" });

    if (parsed.kind === "channel") {
      return setState({ kind: "channel", parsed });
    }

    try {
      const { markdown } = await fetchAndBuildThread(parsed.channelId, parsed.threadTs, parsed.originalUrl);
      setState({ kind: "thread", parsed, markdown });
    } catch (error) {
      const code = error instanceof SlackApiError ? error.code : "unknown_error";
      const hint = ERROR_HINTS[code] ?? `Erro: ${code}`;
      console.error("[messages] thread fetch failed", error);
      await showToast({ style: Toast.Style.Failure, title: "Falha ao buscar thread", message: hint });
      setState({ kind: "error", message: hint, parsed });
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (state.kind === "loading") {
    return <Detail isLoading markdown="" />;
  }

  if (state.kind === "empty") {
    return (
      <Detail
        markdown={EMPTY_MARKDOWN}
        actions={
          <ActionPanel>
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={load} />
          </ActionPanel>
        }
      />
    );
  }

  if (state.kind === "error") {
    return (
      <Detail
        markdown={`# Erro\n\n${state.message}\n\n${state.parsed ? `URL: ${state.parsed.originalUrl}` : ""}`}
        actions={
          <ActionPanel>
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={load} />
            {state.parsed && <Action.OpenInBrowser title="Open Original in Slack" url={state.parsed.originalUrl} />}
          </ActionPanel>
        }
      />
    );
  }

  if (state.kind === "channel") {
    return <RangeForm channelId={state.parsed.channelId} originalUrl={state.parsed.originalUrl} />;
  }

  const { parsed, markdown } = state;
  const stem = `slack-thread-${parsed.channelId}-${parsed.threadTs.replace(".", "_")}`;
  return (
    <MessagesDetail markdown={markdown} filenameStem={stem} summaryKey={parsed.threadTs} channelId={parsed.channelId} />
  );
}
