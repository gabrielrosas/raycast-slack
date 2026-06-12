import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { dayjs } from "../config/dayjs";
import { SlackApiError } from "../common/api/client";
import { fetchAndBuildChannel } from "../common/flows";
import { RangeType, computeRange, rangeLabelFor } from "../common/range";
import MessagesDetail from "./messages-detail";

type Props = {
  channelId: string;
  originalUrl: string;
  channelName?: string;
  channelIsPrivate?: boolean;
};

const ERROR_HINTS: Record<string, string> = {
  not_in_channel: "Você não é membro deste canal.",
  channel_not_found: "Canal não encontrado ou sem acesso.",
  missing_scope: "Falta um scope no token (channels:history, groups:history, im:history, mpim:history).",
  invalid_auth: "Token inválido ou expirado.",
  ratelimited: "Rate limit do Slack atingido. Tente em alguns segundos.",
};

const PRESETS: { value: Exclude<RangeType, "custom">; title: string; subtitle: string; icon: Icon }[] = [
  { value: "today", title: "Hoje", subtitle: "Desde 00:00 até agora", icon: Icon.Sun },
  { value: "unread", title: "Não lidas", subtitle: "Desde a última leitura", icon: Icon.Envelope },
  { value: "24h", title: "Últimas 24h", subtitle: "Últimas 24 horas corridas", icon: Icon.Clock },
  { value: "7d", title: "Últimos 7 dias", subtitle: "1 semana", icon: Icon.Calendar },
  { value: "30d", title: "Últimos 30 dias", subtitle: "1 mês", icon: Icon.Calendar },
];

export default function RangePicker({ channelId, originalUrl, channelName, channelIsPrivate }: Props) {
  const { push } = useNavigation();
  const [isFetching, setIsFetching] = useState(false);

  const run = async (type: RangeType, oldestDate?: Date, latestDate?: Date) => {
    setIsFetching(true);
    try {
      const range = await computeRange(type, channelId, oldestDate, latestDate);
      const label = rangeLabelFor(type, range.oldest, range.latest);
      const result = await fetchAndBuildChannel(channelId, range, label, originalUrl, channelName, channelIsPrivate);

      if (result.truncated) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Mensagens truncadas",
          message: `Mostrando ${result.messageCount} mensagens. Há mais nesse range — refine o filtro.`,
        });
      }

      const summaryKey = dayjs().format("YYYYMMDDHHmm");
      push(
        <MessagesDetail
          markdown={result.markdown}
          filenameStem={`slack-${channelId}-${summaryKey}`}
          summaryKey={summaryKey}
          channelId={channelId}
        />,
      );
    } catch (error) {
      const code = error instanceof SlackApiError ? error.code : "unknown_error";
      const hint = ERROR_HINTS[code] ?? `Erro: ${code}`;
      console.error("[range-picker] fetch failed", error);
      await showToast({ style: Toast.Style.Failure, title: "Falha ao buscar mensagens", message: hint });
    } finally {
      setIsFetching(false);
    }
  };

  const navTitle = `Mensagens de ${channelIsPrivate ? "🔒 " : "#"}${channelName ?? channelId}`;

  return (
    <List isLoading={isFetching} navigationTitle={navTitle} searchBarPlaceholder="Escolha o range...">
      {PRESETS.map((p) => (
        <List.Item
          key={p.value}
          title={p.title}
          subtitle={p.subtitle}
          icon={p.icon}
          actions={
            <ActionPanel>
              <Action title="Show Messages" icon={Icon.MagnifyingGlass} onAction={() => run(p.value)} />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        title="Customizado"
        subtitle="Escolha datas específicas"
        icon={Icon.Gear}
        actions={
          <ActionPanel>
            <Action.Push
              title="Pick Dates"
              icon={Icon.Calendar}
              target={<CustomRangeForm onSubmit={(o, l) => run("custom", o, l)} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function CustomRangeForm({ onSubmit }: { onSubmit: (oldest: Date, latest: Date) => Promise<void> }) {
  const { pop } = useNavigation();
  const handleSubmit = async (values: { oldest: Date; latest: Date }) => {
    pop();
    await onSubmit(values.oldest, values.latest);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Show Messages" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="oldest"
        title="De"
        type={Form.DatePicker.Type.Date}
        defaultValue={dayjs().subtract(7, "day").toDate()}
      />
      <Form.DatePicker id="latest" title="Até" type={Form.DatePicker.Type.Date} defaultValue={new Date()} />
    </Form>
  );
}
