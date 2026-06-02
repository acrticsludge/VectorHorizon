import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VectorHorizon",
  description: "Turn images into persistent, walkable AI worlds.",
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#ffffff",
    colorBackground: "#131315",
    colorForeground: "#f4f4f5",
    colorInputBackground: "#0e0e10",
    colorInputText: "#f4f4f5",
    colorText: "#e5e1e4",
    colorTextSecondary: "#a1a1aa",
    colorNeutral: "#71717a",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans)",
  },
  elements: {
    cardBox: "bg-[#131315] border border-[#27272a] shadow-2xl shadow-black/40",
    card: "bg-[#131315]",
    headerTitle: "text-white tracking-tight",
    headerSubtitle: "text-[#a1a1aa]",
    socialButtonsBlockButton:
      "bg-[#1c1b1d] border-[#27272a] text-white hover:bg-[#27272a]",
    formButtonPrimary:
      "bg-white text-black hover:bg-[#e5e1e4] active:scale-[0.98] transition-all",
    formFieldInput:
      "bg-[#0e0e10] border-[#27272a] text-white focus:border-white focus:ring-white",
    footerActionLink: "text-white hover:text-[#e5e1e4]",
    userButtonPopoverCard:
      "bg-[#131315] border border-[#27272a] shadow-2xl shadow-black/40",
    userButtonPopoverActionButton:
      "text-[#e5e1e4] hover:bg-[#27272a]",
    userButtonPopoverActionButtonText: "text-[#e5e1e4]",
    userPreviewMainIdentifier: "text-white",
    userPreviewSecondaryIdentifier: "text-[#a1a1aa]",
  },
  options: {
    socialButtonsPlacement: "bottom",
    termsPageUrl: "/terms",
    privacyPageUrl: "/privacy",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          afterSignOutUrl="/"
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          appearance={clerkAppearance}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
