import { LiveProvider, LiveProviderState } from "./LiveProvider";
import { tiktokProvider } from "./TikTokProvider";
import { youtubeProvider } from "./YouTubeProvider";
import { simulatorProvider } from "./SimulatorProvider";
import { processIncomingEvent } from "../pipeline";
import { logger } from "../logging/logger";
import { LiveProviderName } from "@live/shared";

const providers: Record<LiveProviderName, LiveProvider> = {
  TIKTOK: tiktokProvider,
  YOUTUBE: youtubeProvider,
  SIMULATOR: simulatorProvider,
};

let wired = false;

/** Wires every provider's events into the shared pipeline. Called once at boot. */
export function wireProviders(): void {
  if (wired) return;
  wired = true;
  for (const provider of Object.values(providers)) {
    provider.onEvent((event) => {
      processIncomingEvent(event).catch((err) => logger.error(err, "Pipeline processing failed"));
    });
  }
}

export async function connectProvider(name: LiveProviderName, channel: string): Promise<void> {
  await providers[name].connect(channel);
}

export async function disconnectProvider(name: LiveProviderName): Promise<void> {
  await providers[name].disconnect();
}

export function getProviderState(name: LiveProviderName): LiveProviderState {
  return providers[name].getState();
}

export function getAllProviderStates(): Record<LiveProviderName, LiveProviderState> {
  return {
    TIKTOK: tiktokProvider.getState(),
    YOUTUBE: youtubeProvider.getState(),
    SIMULATOR: simulatorProvider.getState(),
  };
}
