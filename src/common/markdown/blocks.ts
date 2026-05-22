import type {
  RichTextBlock,
  RichTextChild,
  RichTextElement,
  RichTextList,
  RichTextPreformatted,
  RichTextQuote,
  RichTextSection,
  RichTextStyle,
  SlackBlock,
} from "../api/types";
import type { UserResolver } from "./mrkdwn";
import { renderEmojiName } from "./emoji";

function styleText(text: string, style?: RichTextStyle): string {
  if (!style) return text;
  let out = text;
  if (style.code) return `\`${out}\``;
  if (style.strike) out = `~~${out}~~`;
  if (style.italic) out = `*${out}*`;
  if (style.bold) out = `**${out}**`;
  return out;
}

function renderElement(el: RichTextElement, resolver?: UserResolver): string {
  switch (el.type) {
    case "text":
      return styleText(el.text, el.style);
    case "link": {
      const label = el.text && el.text.length > 0 ? styleText(el.text, el.style) : null;
      return label ? `[${label}](${el.url})` : el.url;
    }
    case "user": {
      const name = resolver?.(el.user_id) ?? el.user_id;
      return `@${name}`;
    }
    case "channel":
      return `#${el.channel_id}`;
    case "emoji":
      return renderEmojiName(el.name, el.unicode);
    case "broadcast":
      return `@${el.range}`;
    case "usergroup":
      return `@group`;
    case "date":
      return el.fallback ?? String(el.timestamp);
    case "color":
      return el.value;
    default:
      return "";
  }
}

function renderInline(elements: RichTextElement[], resolver?: UserResolver): string {
  return elements.map((e) => renderElement(e, resolver)).join("");
}

function renderSection(section: RichTextSection, resolver?: UserResolver): string {
  return renderInline(section.elements, resolver);
}

function renderQuote(quote: RichTextQuote, resolver?: UserResolver): string {
  const content = renderInline(quote.elements, resolver);
  return content
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
}

function renderList(list: RichTextList, resolver?: UserResolver): string {
  const indent = "  ".repeat(Math.max(0, list.indent));
  const marker = list.style === "ordered" ? "1." : "-";
  return list.elements.map((item) => `${indent}${marker} ${renderSection(item, resolver)}`).join("\n");
}

function renderPreformatted(pre: RichTextPreformatted, resolver?: UserResolver): string {
  const content = renderInline(pre.elements, resolver);
  return `\`\`\`\n${content}\n\`\`\``;
}

function renderChild(child: RichTextChild, resolver?: UserResolver): string {
  switch (child.type) {
    case "rich_text_section":
      return renderSection(child, resolver);
    case "rich_text_quote":
      return renderQuote(child, resolver);
    case "rich_text_list":
      return renderList(child, resolver);
    case "rich_text_preformatted":
      return renderPreformatted(child, resolver);
    default:
      return "";
  }
}

function isRichTextBlock(block: SlackBlock): block is RichTextBlock {
  return block.type === "rich_text" && Array.isArray((block as RichTextBlock).elements);
}

export function blocksToMarkdown(blocks: SlackBlock[] | undefined, resolver?: UserResolver): string {
  if (!blocks?.length) return "";

  const children: RichTextChild[] = [];
  for (const block of blocks) {
    if (isRichTextBlock(block)) children.push(...block.elements);
  }
  if (children.length === 0) return "";

  const parts: string[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const rendered = renderChild(child, resolver);
    if (!rendered) continue;

    if (parts.length > 0) {
      const prev = children[i - 1];
      const joinTight = prev.type === "rich_text_list" && child.type === "rich_text_list";
      parts.push(joinTight ? "\n" : "\n\n");
    }
    parts.push(rendered);
  }

  return parts.join("");
}

export function hasRichText(blocks: SlackBlock[] | undefined): boolean {
  if (!blocks?.length) return false;
  return blocks.some((b) => isRichTextBlock(b) && b.elements.length > 0);
}
