import type { Metadata } from "next";
import { DM_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import { THEME_SCRIPT } from "@/components/theme";
import "./globals.css";

// Design system Menthe : polices exposées en variables CSS, reprises par @theme dans globals.css.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Pipeline",
  description: "Mini CRM de prospection",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning : THEME_SCRIPT pose la classe `.dark` sur <html> avant l'hydratation (lot 6).
    <html
      lang="fr"
      className={`${plusJakartaSans.variable} ${dmMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col md:flex-row">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
