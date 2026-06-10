// Конфигурация Prisma CLI (заменяет deprecated-ключ `prisma` в package.json).
// См. https://pris.ly/prisma-config — будет обязательным в Prisma 7.
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // Команда seed демо-данных (запуск: `npx prisma db seed`).
    seed: "tsx prisma/seed.ts",
  },
});
