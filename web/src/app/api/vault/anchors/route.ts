import { fetchAnchorReceipts } from "@/lib/vault-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await fetchAnchorReceipts());
}
