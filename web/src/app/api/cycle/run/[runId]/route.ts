import { getRun } from "@/lib/cycle-runner";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const run = getRun(runId);
  if (!run) {
    return Response.json({ error: "run not found" }, { status: 404 });
  }
  return Response.json(run);
}
