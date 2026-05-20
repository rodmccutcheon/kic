import {RawSignal} from "@/types";

export async function resolveIdentity(signals: RawSignal[]): Promise<string> {
  return Promise.resolve("test");
}