import { randomBytes } from "node:crypto";

/**
 * Генерирует короткий URL-безопасный идентификатор для имён файлов и
 * подобных нужд. Это НЕ замена cuid из Prisma (id сущностей создаёт БД) —
 * только для генерации имён загружаемых файлов.
 */
export function createId(): string {
  return randomBytes(16).toString("hex");
}
