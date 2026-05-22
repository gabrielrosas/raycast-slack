import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { dayjs } from "../config/dayjs";
import { SlackApiError } from "../common/api/client";
import { fetchAndBuildChannel } from "../common/flows";
import { RANGE_OPTIONS, RangeType, computeRange, rangeLabelFor } from "../common/range";
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

export default function RangeForm({ channelId, originalUrl, channelName, channelIsPrivate }: Props) {
  const { push } = useNavigation();
  const [rangeType, setRangeType] = useState<RangeType>("unread");

  const handleSubmit = async (values: { rangeType: string; oldest?: Date; latest?: Date }) => {
    const type = values.rangeType as RangeType;

    try {
      const range = await computeRange(type, channelId, values.oldest, values.latest);
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
      console.error("[range-form] fetch failed", error);
      await showToast({ style: Toast.Style.Failure, title: "Falha ao buscar mensagens", message: hint });
    }
  };

  const description = `Canal: ${channelName ?? channelId}${channelIsPrivate ? " (privado)" : ""}`;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Show Messages" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={description} />
      <Form.Dropdown id="rangeType" title="Range" value={rangeType} onChange={(v) => setRangeType(v as RangeType)}>
        {RANGE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>
      {rangeType === "custom" && (
        <>
          <Form.DatePicker
            id="oldest"
            title="De"
            type={Form.DatePicker.Type.Date}
            defaultValue={dayjs().subtract(7, "day").toDate()}
          />
          <Form.DatePicker id="latest" title="Até" type={Form.DatePicker.Type.Date} defaultValue={new Date()} />
        </>
      )}
    </Form>
  );
}
