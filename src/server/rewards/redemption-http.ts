import { NextResponse } from "next/server";
import { RedemptionError, InsufficientTokensError } from "./redemption";

/** Доменный код ошибки маркетплейса → HTTP-статус. */
const CODE_STATUS: Record<RedemptionError["code"], number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INACTIVE: 409,
  EXPIRED: 409,
  OUT_OF_STOCK: 409,
  REQUIRES_APPROVAL: 409,
  NOT_APPROVABLE: 409,
  WRONG_STATUS: 409,
};

/**
 * Маппит доменные ошибки маркетплейса в JSON-ответ. Возвращает `null`, если
 * ошибка не относится к домену (тогда роут пробрасывает её дальше → 500).
 */
export function redemptionErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InsufficientTokensError) {
    return NextResponse.json(
      { error: error.message || "Недостаточно токенов", code: "INSUFFICIENT_TOKENS" },
      { status: 402 },
    );
  }
  if (error instanceof RedemptionError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: CODE_STATUS[error.code] ?? 400 },
    );
  }
  return null;
}
