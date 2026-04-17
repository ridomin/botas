/**
 * Represents a user or bot identity.
 */
export interface ChannelAccount {
  id: string
  name?: string
  aadObjectId?: string
  role?: string
  /** Preserved as extension data */
  [key: string]: any
}

/**
 * Minimal conversation reference.
 */
export interface Conversation {
  id: string
  /** Preserved as extension data */
  [key: string]: any
}

/**
 * The core message/event model.
 */
export interface CoreActivity {
  type: string
  id?: string
  serviceUrl: string
  channelId?: string
  text?: string
  name?: string
  value?: any
  from: ChannelAccount
  recipient: ChannelAccount
  conversation: Conversation
  entities?: any[]
  attachments?: any[]
  /** Hint for Targeted Messages - not serialized in JSON */
  isTargeted?: boolean
  /** Preserved as extension data */
  [key: string]: any
}

/**
 * Response from the Bot Framework for an outbound activity.
 */
export interface ResourceResponse {
  id: string
}

/**
 * Response from an invoke activity handler.
 */
export interface InvokeResponse {
  status: number
  body?: any
}
