"use client";

import { ServerError, type ServerErrorProps } from "@/components/server-error";

export default function GlobalError(props: ServerErrorProps) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ServerError {...props} />
      </body>
    </html>
  );
}
