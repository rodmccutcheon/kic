import { prisma } from "./db";
import { RawSignal, SIGNAL_PRECEDENCE, SignalType } from "@/types";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function resolveIdentity(tx: TxClient, signals: RawSignal[]): Promise<string> {
  return (await findExistingCustomer(tx, signals)) ?? await createCustomerWithSignals(tx, signals);
}

async function findExistingCustomer(tx: TxClient, signals: RawSignal[]): Promise<string | null> {
  for (const tier of SIGNAL_PRECEDENCE) {
    const customerId = await matchTier(tx, signals, tier);
    if (customerId) return customerId;
  }
  return null;
}

async function matchTier(tx: TxClient, signals: RawSignal[], tier: SignalType[]): Promise<string | null> {
  const tierSignals = signals.filter((s) => tier.includes(s.type as SignalType));
  if (tierSignals.length === 0) return null;

  const matchingSignals = await tx.identitySignal.findMany({
    where: { OR: tierSignals.map((s) => ({ type: s.type, value: s.value })) },
    select: { id: true },
  });
  if (matchingSignals.length === 0) return null;

  const customerLinks = await tx.customerSignal.findMany({
    where: { signalId: { in: matchingSignals.map((s) => s.id) }, customer: { deletedAt: null } },
    select: { customerId: true },
  });
  if (customerLinks.length === 0) return null;

  const customerIds = [...new Set(customerLinks.map((l) => l.customerId))].sort();
  if (customerIds.length > 1) await mergeIntoCanonical(tx, customerIds[0], customerIds.slice(1), signals);
  return customerIds[0];
}

async function mergeIntoCanonical(tx: TxClient, canonical: string, absorbed: string[], signals: RawSignal[]): Promise<void> {
  const signalsToLink = await tx.customerSignal.findMany({
    where: { customerId: { in: absorbed } },
    select: { signalId: true },
  });

  await tx.customerSignal.createMany({
    data: signalsToLink.map((s) => ({ signalId: s.signalId, customerId: canonical })),
  });

  const eventsToLink = await tx.customerEvent.findMany({
    where: { customerId: { in: absorbed } },
    select: { eventId: true },
  });

  await tx.customerEvent.createMany({
    data: eventsToLink.map((e) => ({ eventId: e.eventId, customerId: canonical })),
  });

  await Promise.all(
    absorbed.map((absorbedId) =>
      tx.mergeRecord.create({
        data: {
          canonicalId: canonical,
          absorbedId,
          signals: JSON.stringify(signals),
          copiedSignalIds: JSON.stringify(signalsToLink.map((s) => s.signalId)),
          copiedEventIds: JSON.stringify(eventsToLink.map((e) => e.eventId)),
          confidence: "deterministic",
        },
      })
    )
  );

  await tx.customer.updateMany({
    where: { id: { in: absorbed } },
    data: { deletedAt: new Date() },
  });
}

async function createCustomerWithSignals(tx: TxClient, signals: RawSignal[]): Promise<string> {
  const customer = await tx.customer.create({ data: {} });

  const upsertedSignals = await Promise.all(
    signals.map((s) =>
      tx.identitySignal.upsert({
        where: { type_value: { type: s.type, value: s.value } },
        create: { type: s.type, value: s.value },
        update: {},
      })
    )
  );

  await tx.customerSignal.createMany({
    data: upsertedSignals.map((s) => ({ signalId: s.id, customerId: customer.id })),
  });

  return customer.id;
}
