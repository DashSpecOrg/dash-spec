import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";
import { loadDashboard } from "../../../../lib/rustfs";
import { runProSquareQuery } from "../../../../lib/prosquare";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    key: string[];
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  noStore();

  try {
    const params = await context.params;
    const key = params.key.join("/");
    const dashboard = await loadDashboard(key);
    const cards = await Promise.all(
      dashboard.spec.cards.map(async (card) => {
        try {
          const result = await runProSquareQuery(card.parsedExpr);
          return { card, result };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Query execution failed";
          return { card, error: message };
        }
      }),
    );

    return NextResponse.json({
      ...dashboard,
      cards,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
