import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stockist App — Find retail partners",
  description:
    "Analyze your product and discover contact-ready retail partners.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
