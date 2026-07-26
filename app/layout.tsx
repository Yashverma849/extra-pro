import type { Metadata } from "next";
import "./globals.css";
import "./reports.css";
import "./intranet.css";

export const metadata: Metadata = {
  title: "The New India Assurance Co. Ltd. — Oman Operations | AML/CFT Portal",
  description: "Oman Operations intranet AML/CFT surveillance, screening and UBO registry.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
