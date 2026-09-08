import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Orbit CRM｜客户关系管理演示",
  description:
    "基于 Next.js、NestJS 与 PostgreSQL 的多租户客户关系管理演示，每个团队拥有独立的数据空间。",
  // Chrome offers to translate an English page for a visitor whose browser is
  // set to another language, and its translator swaps text nodes for <font>
  // wrappers of its own. The next React update walks a tree it no longer
  // recognises and throws insertBefore, which reaches the visitor as a blank
  // "Application error" the moment they interact with the dashboard.
  other: { google: "notranslate" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" translate="no" className="notranslate">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
