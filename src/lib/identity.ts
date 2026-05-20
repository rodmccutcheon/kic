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
    where: { signalId: { in: matchingSignals.map((s) => s.id) } },
    select: { customerId: true },
  });
  if (customerLinks.length === 0) return null;

  const customerIds = [...new Set(customerLinks.map((l) => l.customerId))].sort();
  if (customerIds.length > 1) await mergeIntoCanonical(tx, customerIds[0], customerIds.slice(1));
  return customerIds[0];
}

async function mergeIntoCanonical(tx: TxClient, canonical: string, absorbed: string[]): Promise<void> {
  const signalsToLink = await tx.customerSignal.findMany({
    where: { customerId: { in: absorbed } },
    select: { signalId: true },
  });

  await tx.customerSignal.createMany({
    data: signalsToLink.map((s) => ({ signalId: s.signalId, customerId: canonical })),
  });
}

async function createCustomerWithSignals(tx: TxClient, signals: RawSignal[]): Promise<string> {
  const customer = await tx.customer.create({ data: {} });

  await tx.identitySignal.createMany({
    data: signals.map((s) => ({ type: s.type, value: s.value })),
    skipDuplicates: true,
  });

  const created = await tx.identitySignal.findMany({
    where: { OR: signals.map((s) => ({ type: s.type, value: s.value })) },
    select: { id: true },
  });

  await tx.customerSignal.createMany({
    data: created.map((s) => ({ signalId: s.id, customerId: customer.id })),
  });

  return customer.id;
}
