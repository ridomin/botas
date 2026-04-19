export interface CoreActivity {
  type: string;
  id?: string;
  serviceUrl: string;
  channelId?: string;
  text?: string;
  name?: string;
  value?: unknown;
  from: ChannelAccount;
  recipient: ChannelAccount;
  conversation: Conversation;
  entities?: Entity[];
  attachments?: Attachment[];
  properties?: Record<string, unknown>;
}

export interface ChannelAccount {
  id: string;
  name?: string;
  aadObjectId?: string;
  role?: string;
  properties?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  properties?: Record<string, unknown>;
}

export interface Entity {
  type: string;
  properties?: Record<string, unknown>;
}

export interface Attachment {
  contentType?: string;
  content?: unknown;
  name?: string;
}

export interface ResourceResponse {
  id: string;
}

export interface InvokeResponse {
  status: string;
  body?: unknown;
}