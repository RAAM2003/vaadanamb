import React from "react";
import "./globals.css";

export const metadata = {
  title: "Vaadhanamb Procurement Agent",
  description: "Next.js UI for procurement team agent configuration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
