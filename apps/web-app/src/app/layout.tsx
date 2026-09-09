import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { Providers } from "./providers";

const baseMetadata: Metadata = {
  title: {
    default: "Leonly",
    template: "%s | Leonly",
  },
  description: "Private, elegant sanctuary for shared memories.",
};

export function generateMetadata(): Metadata {
  return {
    ...baseMetadata,
    other: { ...Sentry.getTraceData() },
  };
}

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
