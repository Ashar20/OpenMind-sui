import { startRun } from "@/lib/cycle-runner";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { runId, alreadyRunning } = startRun();
    return Response.json({ runId, alreadyRunning });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "failed to start run" },
      { status: 500 },
    );
  }
}
