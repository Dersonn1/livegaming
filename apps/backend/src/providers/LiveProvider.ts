import { LiveEvent } from "@live/shared";

export type LiveProviderStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export interface LiveProviderState {
  status: LiveProviderStatus;
  channel: string | null;
  lastEventAt: string | null;
  error: string | null;
}

/**
 * Common contract every live-platform integration must implement. The
 * pipeline (Normalizer -> Aggregator -> Rule Engine -> Command Queue) only
 * ever talks to this interface, never to a concrete provider, which is what
 * makes adding a new platform (Twitch, Kick, ...) additive rather than
 * invasive.
 */
export interface LiveProvider {
  readonly name: string;
  connect(channel: string): Promise<void>;
  disconnect(): Promise<void>;
  getState(): LiveProviderState;
  onEvent(handler: (event: LiveEvent) => void): void;
}
