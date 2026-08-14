/**
 * Type definitions for OpenCode Connector.
 */

/** GET /global/health response */
export interface HealthResponse {
  healthy: true;
  version: string;
}

/** GET /path response */
export interface PathResponse {
  home: string;
  state: string;
  config: string;
  worktree: string;
  directory: string;
}

/** Session time info */
export interface SessionTime {
  created: number;
  updated: number;
  archived?: number;
}

/** GET /session response item */
export interface SessionInfo {
  id: string;
  title: string;
  directory: string;
  parentID?: string;
  time: SessionTime;
  share?: string;
}

/** GET /agent response item */
export interface AgentInfo {
  name: string;
  description: string;
  mode: 'primary' | 'subagent';
}

/** GET /command response item */
export interface CommandInfo {
  name: string;
  description: string;
  template: string;
  agent: string;
}

/** POST /session/:id/message request body */
export interface MessageInput {
  /** Optional model override. OpenCode uses the session default when omitted. */
  model?: {
    providerID: string;
    modelID: string;
  };
  /** Optional agent override. */
  agent?: string;
  /** Prevent the model from replying when set. */
  noReply?: boolean;
  parts: MessagePart[];
}

/** Text message part accepted by the session message API. */
export interface TextMessagePart {
  type: 'text';
  id?: string;
  text: string;
}

/** File source metadata used to preserve an inline reference and line range. */
export interface FileMessageSource {
  type: 'file';
  path: string;
  text: {
    value: string;
    start: number;
    end: number;
  };
}

/** File message part accepted by the session message API. */
export interface FileMessagePart {
  type: 'file';
  id?: string;
  mime: string;
  filename?: string;
  url: string;
  source?: FileMessageSource;
}

/** Message part accepted by the session message API. */
export type MessagePart = TextMessagePart | FileMessagePart;

/** File reference to attach to a structured OpenCode message. */
export interface FileReferenceInput {
  /** Absolute path visible to the OpenCode server. */
  filePath: string;
  /** Path shown in the @ reference, without the leading @. */
  displayPath: string;
  /** MIME type for the attachment. Defaults to text/plain. */
  mimeType?: string;
  /** One-based inclusive starting line. */
  startLine?: number;
  /** One-based inclusive ending line. */
  endLine?: number;
}

/** TUI event for POST /tui/publish */
export interface TuiPublishEvent {
  type: string;
  properties: Record<string, unknown>;
}

/** GET /vcs response */
export interface VcsInfo {
  branch: string;
}
