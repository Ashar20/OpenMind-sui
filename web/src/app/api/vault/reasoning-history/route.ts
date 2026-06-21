import { buildCycleHistory, readFills } from "@/lib/vault-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(buildCycleHistory(readFills()));
}
