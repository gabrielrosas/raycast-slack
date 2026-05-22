import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import AskAi from "./ask-ai";
import Summary from "./summary";
import Translate from "./translate";

type Props = {
  markdown: string;
  filenameStem: string;
  summaryKey: string;
  channelId: string;
};

export default function MessagesDetail({ markdown, filenameStem, summaryKey, channelId }: Props) {
  const handleExport = async () => {
    const filePath = join(homedir(), "Downloads", `${filenameStem}.md`);
    try {
      await writeFile(filePath, markdown, "utf8");
      await showToast({ style: Toast.Style.Success, title: "Arquivo salvo", message: filePath });
    } catch (error) {
      console.error(error);
      await showToast({ style: Toast.Style.Failure, title: "Falha ao salvar", message: String(error) });
    }
  };

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Markdown" content={markdown} />
          <Action
            title="Export Markdown"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={handleExport}
          />
          <Action.Push
            title="Ask AI"
            icon={Icon.QuestionMark}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            target={<AskAi markdown={markdown} />}
          />
          <Action.Push
            title="Translate with AI"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            target={<Translate markdown={markdown} channelId={channelId} tsKey={summaryKey} />}
          />
          <Action.Push
            title="Summarize with AI"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<Summary markdown={markdown} channelId={channelId} threadTs={summaryKey} />}
          />
        </ActionPanel>
      }
    />
  );
}
