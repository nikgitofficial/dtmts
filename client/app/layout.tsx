import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Secure Auth", description: "Sign in securely" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
