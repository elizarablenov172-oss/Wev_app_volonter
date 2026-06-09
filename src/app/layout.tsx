import type { Metadata } from "next";
import { Toaster } from "sonner";
import { montserrat } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Евразия — Платформа волонтёров",
  description:
    "Участвуй в мероприятиях и заданиях, получай social tokens и обменивай их на награды.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${montserrat.variable} antialiased`}>
      <body className="min-h-dvh bg-background font-sans text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
