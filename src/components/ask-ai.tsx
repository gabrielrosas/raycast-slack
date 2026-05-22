import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useAI } from "@raycast/utils";

const SYSTEM = `You are an assistant analyzing a Slack conversation.

Answer the user's question below using ONLY information from the conversation.
Respond in the SAME language as the user's question.
Be concise and direct. Format with Markdown when it helps clarity (lists, code, bold).
If the conversation doesn't contain the answer, say so explicitly — do not invent.`;

function buildPrompt(question: string, markdown: string): string {
  return `${SYSTEM}\n\n---\n\nUSER QUESTION:\n\n${question}\n\n---\n\nCONVERSATION:\n\n${markdown}`;
}

type Props = { markdown: string };

export default function AskAi({ markdown }: Props) {
  const { push } = useNavigation();

  const handleSubmit = (values: { question: string }) => {
    const q = values.question.trim();
    if (!q) return;
    push(<AskAiAnswer question={q} markdown={markdown} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask" icon={Icon.Stars} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Faça uma pergunta sobre a conversa. A IA responde no idioma da sua pergunta usando só o conteúdo da thread/canal." />
      <Form.TextArea
        id="question"
        title="Pergunta"
        placeholder="Ex: qual foi a decisão sobre X? quem ficou responsável por Y?"
      />
    </Form>
  );
}

function AskAiAnswer({ question, markdown }: { question: string; markdown: string }) {
  const { pop } = useNavigation();
  const { data, isLoading, revalidate } = useAI(buildPrompt(question, markdown), { creativity: "low" });

  const display = `> **Pergunta:** ${question}\n\n---\n\n${data || "_Pensando..._"}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={display}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={data || ""} />
          <Action
            title="Regenerate"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
          <Action
            title="Ask Another"
            icon={Icon.QuestionMark}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    />
  );
}
