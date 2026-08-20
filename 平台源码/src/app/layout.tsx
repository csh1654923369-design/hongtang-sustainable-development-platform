import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "红塘村可持续发展平台",
  description: "以二维地图和三维实景呈现红塘村专题空间数据。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <div className="site-content">{children}</div>
      </body>
    </html>
  );
}
