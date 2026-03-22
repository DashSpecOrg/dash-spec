import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";
import { listDashboards } from "../../../lib/rustfs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore();

  try {
    const dashboards = await listDashboards();
    return NextResponse.json({ dashboards });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list dashboards";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
