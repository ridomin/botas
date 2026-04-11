// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** Base channel data attached to an activity. */
export interface ChannelData {
  /** Client-generated activity ID. */
  clientActivityId?: string;
  /** Additional channel-specific properties. */
  [key: string]: unknown;
}

/** A Teams channel reference. */
export interface TeamsChannel {
  /** Channel ID. */
  id?: string;
  /** Channel display name. */
  name?: string;
}

/** A Teams tenant reference. */
export interface TeamsChannelDataTenant {
  /** Tenant ID. */
  id?: string;
}

/** A Teams team reference. */
export interface Team {
  /** Team ID. */
  id?: string;
  /** Team display name. */
  name?: string;
}

/** Settings block in Teams channel data. */
export interface TeamsChannelDataSettings {
  /** The selected channel when the bot is installed. */
  selectedChannel?: TeamsChannel;
}

/** Teams-specific channel data extending the base ChannelData. */
export interface TeamsChannelData extends ChannelData {
  /** Tenant information. */
  tenant?: TeamsChannelDataTenant;
  /** Team information. */
  team?: Team;
  /** Channel information. */
  channel?: TeamsChannel;
  /** Settings (used in installationUpdate activities). */
  settings?: TeamsChannelDataSettings;
}
