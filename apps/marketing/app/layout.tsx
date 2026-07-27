import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stockist — Find the right stores for your product",
  description:
    "Turn your product website into a contact-ready list of retail partners.",
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
