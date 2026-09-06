import type { Metadata } from "next";
import "./globals.css";
import "./menu.css";

export const metadata: Metadata = {
  title: "PACE — Academic workload, made realistic.",
  description: "PACE turns assignments, exams, effort, priorities, and available study time into a realistic academic plan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
