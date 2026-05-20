import { prisma } from "./db";
import { RawSignal, SIGNAL_PRECEDENCE, SignalType } from "@/types";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function resolveIdentity(tx: TxClient, signals: RawSignal[]): Promise<string> {
  for (const tier of SIGNAL_PRECEDENCE) {
    const tierSignals = signals.filter((s) => tier.includes(s.type as SignalType));
    if (tierSignals.length === 0) continue;

    const matchingSignals = await tx.identitySignal.findMany({
      where: { OR: tierSignals.map((s) => ({ type: s.type, value: s.value })) },
      select: { id: true },
    });
    if (matchingSignals.length === 0) continue;

    const customerLinks = await tx.customerSignal.findMany({
      where: { signalId: { in: matchingSignals.map((s) => s.id) } },
      select: { customerId: true },
    });
    if (customerLinks.length === 0) continue;

    const customerIds = [...new Set(customerLinks.map((l) => l.customerId))];
    return customerIds[0];
  }

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

