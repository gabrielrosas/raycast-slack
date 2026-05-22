import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getDefaultLanguage } from "../common/preferences";
import Summary from "./summary";

const SYSTEM = (language: string) => `Translate the markdown below to ${language}, preserving 100% of the structure:

- Keep all headers, lists, blockquotes, tables, code blocks, links, and HTML/markdown syntax intact.
- Keep emojis (Unicode and :shortcodes:) exactly as they are.
- Keep @user mentions and #channel references exactly as they are — DO NOT translate names.
- Keep code content (inside \`\`\` \`\`\` or backticks) untranslated.
- Translate ONLY the natural language text content.
- Do not add any commentary, summary, or extra text. Output ONLY the translated markdown.`;

function buildPrompt(markdown: string): string {
  const language = getDefaultLanguage();
  return `${SYSTEM(language)}\n\n---\n\nORIGINAL:\n\n${markdown}`;
}

export default function Translate({
  markdown,
  channelId,
  tsKey,
}: {
  markdown: string;
  channelId: string;
  tsKey: string;
}) {
  const { data: translated, isLoading, revalidate } = useAI(buildPrompt(markdown), { creativity: "low" });

  const handleSave = async () => {
    if (!translated) return;
    const filename = `slack-translation-${channelId}-${tsKey.replace(".", "_")}.md`;
    const filePath = join(homedir(), "Downloads", filename);
    try {
      await writeFile(filePath, translated, "utf8");
      await showToast({ style: Toast.Style.Success, title: "Tradução salva", message: filePath });
    } catch (error) {
      console.error(error);
      await showToast({ style: Toast.Style.Failure, title: "Falha ao salvar", message: String(error) });
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={translated || "_Gerando tradução..._"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Translation" content={translated || ""} />
          <Action
            title="Save Translation"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={handleSave}
          />
          <Action.Push
            title="Summarize with AI"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<Summary markdown={markdown} channelId={channelId} threadTs={tsKey} />}
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
