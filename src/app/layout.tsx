import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaultMind — private document AI on 0G",
  description:
    "Encrypt your documents in your browser, store them on decentralized 0G Storage, and ask questions answered by 0G compute. Zero Cup 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-slate-200 antialiased">{children}</body>
    </html>
  );
}
