export type UserInfo = {
  id: string;
  nickname: string;
  name: string;
  image: string;
};

export type RichTextStyle = {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
};

export type RichTextElement =
  | { type: "text"; text: string; style?: RichTextStyle }
  | { type: "link"; url: string; text?: string; style?: RichTextStyle }
  | { type: "user"; user_id: string; style?: RichTextStyle }
  | { type: "channel"; channel_id: string; style?: RichTextStyle }
  | { type: "emoji"; name: string; unicode?: string }
  | { type: "broadcast"; range: "here" | "channel" | "everyone" }
  | { type: "usergroup"; usergroup_id: string }
  | { type: "color"; value: string }
  | { type: "date"; timestamp: number; format?: string; fallback?: string; url?: string };

export type RichTextSection = { type: "rich_text_section"; elements: RichTextElement[] };
export type RichTextQuote = { type: "rich_text_quote"; elements: RichTextElement[] };
export type RichTextList = {
  type: "rich_text_list";
  style: "bullet" | "ordered";
  indent: number;
  elements: RichTextSection[];
};
export type RichTextPreformatted = {
  type: "rich_text_preformatted";
  elements: RichTextElement[];
};

export type RichTextChild = RichTextSection | RichTextQuote | RichTextList | RichTextPreformatted;
export type RichTextBlock = { type: "rich_text"; elements: RichTextChild[] };
export type SlackBlock = RichTextBlock | { type: string; [key: string]: unknown };

export type SlackMessage = {
  type?: string;
  subtype?: string;
  user?: string;
  bot_id?: string;
  username?: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  reactions?: { name: string; count: number; users: string[] }[];
  edited?: { user: string; ts: string };
  files?: { name?: string; url_private?: string; permalink?: string; mimetype?: string }[];
  attachments?: { fallback?: string; title?: string; title_link?: string; text?: string }[];
  blocks?: SlackBlock[];
};

export type Conversation = {
  id: string;
  url: string;
  name: string;
  type: "im" | "mpim" | "channel" | "private_channel";
  image: string;
  lastUsed?: number | null;
  topic?: string;
  unreadCount?: number;
};

export type ChannelInfo = {
  id: string;
  name?: string;
  is_im?: boolean;
  is_mpim?: boolean;
  is_channel?: boolean;
  is_private?: boolean;
  user?: string;
};
