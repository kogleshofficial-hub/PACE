import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./menu.css";

const siteUrl = "https://pace-nu-seven.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "PACE — Academic workload, made realistic.",
  description: "PACE turns assignments, exams, effort, priorities, and available study time into a realistic academic plan.",
  applicationName: "PACE",
  generator: "Next.js",
  authors: [{ name: "Koglesh R. Murugan" }],
  creator: "Koglesh R. Murugan",
  keywords: ["student planner", "academic planner", "study planner", "workload planner", "PACE"],
  alternates: { canonical: "/" },
  verification: {
    google: "LI6z3Avdq6RsVP2faZ6nlhcbRwvnMIdjJkrSBygvnZM",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "PACE — Academic workload, made realistic.",
    description: "A realistic academic planning workspace built around workload, capacity, priorities, and deadlines.",
    siteName: "PACE",
  },
  twitter: {
    card: "summary",
    title: "PACE — Academic workload, made realistic.",
    description: "A realistic academic planning workspace built around workload, capacity, priorities, and deadlines.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050606",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
