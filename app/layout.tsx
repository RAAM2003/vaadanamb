import React from "react";
import "./globals.css";

export const metadata = {
  title: "DomainBridge AI — Procurement Workflow Demo",
  description: "Prototype for purchase-order risk review and supplier follow-up message preparation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
