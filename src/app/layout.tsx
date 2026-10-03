import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Type Matrix",
  description:
    "A game room built on creature data: battle calculator, team builder and daily puzzles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
