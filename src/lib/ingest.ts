import { prisma } from "./db";
import { EventDescriptor, RawSignal } from "@/types";
import { resolveIdentity } from "./identity";

export async function ingestEvent(signals: RawSignal[], descriptor: EventDescriptor): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.event.findUnique({ where: { externalId: descriptor.externalId } });
    if (existing) return;

    const customerId = await resolveIdentity(signals);

    const event = await tx.event.create({
      data: {
        source: descriptor.source,
        type: descriptor.type,
        externalId: descriptor.externalId,
        payload: JSON.stringify(descriptor.payload),
        occurredAt: descriptor.occurredAt,
      },
    });

    await tx.customerEvent.upsert({
      where: { customerId_eventId: { customerId, eventId: event.id } },
      create: { customerId, eventId: event.id },
      update: {},
    });
  });
}