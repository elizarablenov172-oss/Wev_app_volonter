import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { getBalance } from "@/server/tokens/ledger";

/** GET /api/wallet — текущий баланс токенов. */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const balance = await getBalance(auth.id);
  return NextResponse.json({ balance });
}
