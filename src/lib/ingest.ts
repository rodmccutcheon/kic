import { prisma } from "./db";
import {EventDescriptor, RawSignal} from "@/types";

export async function ingestEvent(signals: RawSignal[], descriptor: EventDescriptor): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.event.create({
      data: {
        source: descriptor.source,
        type: descriptor.type,
        externalId: descriptor.externalId,
        payload: JSON.stringify(descriptor.payload),
        occurredAt: descriptor.occurredAt,
      },
    });
  });
}