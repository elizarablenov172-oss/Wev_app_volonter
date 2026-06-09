import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface PagePlaceholderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Брендированная заглушка раздела «В разработке» для следующих этапов. */
export function PagePlaceholder({
  title,
  description,
  children,
}: PagePlaceholderProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <Badge variant="warning">В разработке</Badge>
      </div>
      {description && <p className="text-muted">{description}</p>}
      {children ?? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="font-semibold">Скоро здесь появится контент</p>
            <p className="text-sm text-muted">
              Раздел подключается на следующих этапах разработки.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
