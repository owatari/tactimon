import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tactimon Online",
  description: "Persistent tactical monster MMORPG prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
