import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { STIX_Two_Text } from "next/font/google";
import "./globals.css";
import { readPreferences } from "@/lib/preferences/server";
import { PreferencesProvider } from "@/lib/preferences/provider";
import { AppBar } from "@/components/app-bar";

// Rendered math notation — the product's voice (true textbook math glyphs).
const stixTwoText = STIX_Two_Text({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-stix",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quanta",
  description:
    "Live-math engineering calculations — type formulas that render as textbook notation, track units, and recalculate like a spreadsheet.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { density, theme } = await readPreferences();

  return (
    <html
      lang="en"
      data-density={density}
      data-theme={theme}
      className={`${GeistSans.variable} ${GeistMono.variable} ${stixTwoText.variable}`}
      suppressHydrationWarning
    >
      <body>
        <PreferencesProvider initialDensity={density} initialTheme={theme}>
          <div className="flex min-h-screen flex-col">
            <AppBar />
            {children}
          </div>
        </PreferencesProvider>
      </body>
    </html>
  );
}
