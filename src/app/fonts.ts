import { Montserrat } from "next/font/google";

/** Основной фирменный шрифт «Евразия». Cyrillic-subset обязателен (интерфейс русский). */
export const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

// Дополнительный шрифт Akrobat (Black/SemiBold) подключается локально, когда появятся
// файлы public/fonts/Akrobat-*.woff2 (next/font/local). До этого --font-display
// использует Montserrat 800 как fallback (см. globals.css).
