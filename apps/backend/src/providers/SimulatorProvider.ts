import { LiveEvent, LiveEventType } from "@live/shared";
import { LiveProvider, LiveProviderState } from "./LiveProvider";
import { normalizeEvent } from "../events/normalizer";

export interface SimulatedEventInput {
  type: LiveEventType;
  username: string;
  amount?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * The Live Simulator provider. It implements the exact same LiveProvider
 * interface as TikTok/YouTube, and its events are normalized through the
 * same normalizeEvent() function — so anything that works in the simulator
 * is guaranteed to work identically with a real LIVE connected.
 */
export class SimulatorProvider implements LiveProvider {
  readonly name = "SIMULATOR";
  private state: LiveProviderState = {
    status: "DISCONNECTED",
    channel: null,
    lastEventAt: null,
    error: null,
  };
  private handlers: Array<(event: LiveEvent) => void> = [];

  async connect(channel: string): Promise<void> {
    this.state = { status: "CONNECTED", channel, lastEventAt: null, error: null };
  }

  async disconnect(): Promise<void> {
    this.state = { status: "DISCONNECTED", channel: null, lastEventAt: null, error: null };
  }

  getState(): LiveProviderState {
    return this.state;
  }

  onEvent(handler: (event: LiveEvent) => void): void {
    this.handlers.push(handler);
  }

  /** Called by POST /api/simulator/event. */
  emit(userId: string, input: SimulatedEventInput): LiveEvent {
    const event = normalizeEvent({
      provider: "SIMULATOR",
      type: input.type,
      userId,
      username: input.username,
      amount: input.amount,
      message: input.message,
      metadata: input.metadata,
    });
    this.state.lastEventAt = event.timestamp;
    for (const handler of this.handlers) handler(event);
    return event;
  }
}

export const simulatorProvider = new SimulatorProvider();
