import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lookahead & PPC Control System",
  description: "Sistema en la nube para planeamiento y control semanal de obras viales",
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
