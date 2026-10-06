import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

// The VibeKids voice in type: Baloo 2 (round, chunky, toy-like) for display/UI labels,
// Nunito (soft, extremely readable) for body & chat. Both loaded self-hosted via
// next/font — no runtime Google requests.
const display = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeKids — build your own apps ✨",
  description: "A friendly buddy that helps kids build their own apps and games.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-dvh antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
