import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getDefaultLanguage } from "../common/preferences";

const SYSTEM = (language: string) => `You are an assistant that summarizes Slack conversations.

Write the ENTIRE output in ${language}. This includes section headers, bullet points, and all prose. Translate the example labels below into ${language} naturally.

The conversation below is typically about tasks, planning, or technical discussions. Produce a structured Markdown summary covering, when applicable:

## Context
1–2 sentences about the central topic.

## Decisions made
- Concise bullets of what was agreed.

## Actions / tasks
Checklist using \`- [ ]\`. Include the responsible person in parentheses when mentioned. Example: \`- [ ] Update the big fish icon (Roberto)\`.

## Open items
- Open questions, deferred decisions, follow-ups needed.

## Next steps
- Scheduled meetings, deadlines, concrete future actions — only if mentioned.

RULES:
- Use ONLY information present in the conversation. Do not invent.
- Omit sections that have no content (don't write "none" — just skip).
- Be concise: one line per item.
- Keep people's names exactly as they appear in the conversation.
- The final output must be entirely in ${language}, including the section headers.`;

function buildPrompt(markdown: string): string {
  const language = getDefaultLanguage();
  return `${SYSTEM(language)}\n\n---\n\nCONVERSATION:\n\n${markdown}`;
}

export default function Summary({
  markdown,
  channelId,
  threadTs,
}: {
  markdown: string;
  channelId: string;
  threadTs: string;
}) {
  const { data, isLoading, revalidate } = useAI(buildPrompt(markdown), { creativity: "low" });

  const handleSave = async () => {
    if (!data) return;
    const filename = `slack-summary-${channelId}-${threadTs.replace(".", "_")}.md`;
    const filePath = join(homedir(), "Downloads", filename);
    try {
      await writeFile(filePath, data, "utf8");
      await showToast({ style: Toast.Style.Success, title: "Resumo salvo", message: filePath });
    } catch (error) {
      console.error(error);
      await showToast({ style: Toast.Style.Failure, title: "Falha ao salvar", message: String(error) });
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={data || "_Gerando resumo..._"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Summary" content={data || ""} />
          <Action
            title="Save to ~/Downloads"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={handleSave}
          />
          <Action
            title="Regenerate"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
