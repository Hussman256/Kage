import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import ClientPrivyProvider from "./components/client-privy-provider";
import { ThemeProvider } from "./components/theme-provider";
import { InstallPWA } from "./components/InstallPWA";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
  weight: "300 700",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "400 600",
});
const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-noto-serif-jp",
  display: "swap",
});

const APP_NAME = "Kage";
const APP_DEFAULT_TITLE = "Kage — copy the shadow of the smartest money on Monad";
const APP_TITLE_TEMPLATE = "%s · Kage";
const APP_DESCRIPTION =
  "Copy the shadow of the smartest money on Monad. Non-custodial social copy-trading on Kuru, curated by Nansen smart-money signal — never raw PnL.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

// Every route depends on client-side Privy auth state, and static
// prerendering trips over PrivyProvider without a real, well-formed app ID
// (which isn't available until a Privy dashboard account is set up) — so
// this whole app renders dynamically rather than being statically generated.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07030D" },
    { media: "(prefers-color-scheme: light)", color: "#EFEAE4" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJP.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <ClientPrivyProvider>
            {children}
            <InstallPWA />
          </ClientPrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
