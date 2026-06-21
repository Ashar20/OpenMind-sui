import { fetchLatestReasoning } from "@/lib/vault-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const latest = await fetchLatestReasoning();
  if (!latest) return Response.json(null);
  return Response.json(latest);
}
