import { prisma } from "./db";
import { RawSignal } from "@/types";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function resolveIdentity(tx: TxClient, signals: RawSignal[]): Promise<string> {
  return (await tx.customer.create({ data: {} })).id;
}

