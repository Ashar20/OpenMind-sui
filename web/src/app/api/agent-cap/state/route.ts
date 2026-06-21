import { fetchAgentCapState } from "@/lib/vault-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await fetchAgentCapState());
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "agent cap unreadable" },
      { status: 500 },
    );
  }
}
