import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { aggregateUboRoutes } from "@/lib/ubo-calculation";
import { readStore } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = readStore();
  const aggregates = aggregateUboRoutes(store.uboRecords);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    batches: store.uploadBatches,
    cases: store.cases,
    parties: store.customers,
    uboRecords: store.uboRecords,
    uboAggregates: aggregates,
    watchlistVersions: store.watchlistVersions,
    activities: store.activities,
    exceptions: store.uploadBatches.filter(item => item.exceptionCount > 0),
  });
}
