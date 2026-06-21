import { fetchVaultState } from "@/lib/vault-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await fetchVaultState());
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "vault unreadable" },
      { status: 500 },
    );
  }
}
