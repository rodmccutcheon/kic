import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function resolveCanonicalId(customerId: string): Promise<string> {
  const merge = await prisma.mergeRecord.findFirst({
    where: { absorbedId: customerId },
    select: { canonicalId: true },
    orderBy: { createdAt: "desc" },
  });
  if (merge) return resolveCanonicalId(merge.canonicalId);
  return customerId;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }

  const signal = await prisma.identitySignal.findFirst({
    where: { value: q },
    select: { id: true },
  });

  if (!signal) {
    return NextResponse.json({ error: "No customer found" }, { status: 404 });
  }

  const customerSignal = await prisma.customerSignal.findFirst({
    where: { signalId: signal.id },
    select: { customerId: true },
  });

  if (!customerSignal) {
    return NextResponse.json({ error: "No customer found" }, { status: 404 });
  }

  const canonicalId = await resolveCanonicalId(customerSignal.customerId);

  const customer = await prisma.customer.findUnique({
    where: { id: canonicalId },
    include: {
      customerSignals: { include: { signal: true } },
      events: { include: { event: true } },
      mergesAsCanonical: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "No customer found" }, { status: 404 });
  }

  return NextResponse.json({
    id: customer.id,
    signals: customer.customerSignals.map((cs) => cs.signal),
    events: customer.events
      .map((ce) => ce.event)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
    merges: customer.mergesAsCanonical,
  });
}
