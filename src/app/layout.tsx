import type { Metadata } from "next";
import "./globals.css";
import { DemoProvider } from "@/components/providers/DemoProvider";

export const metadata: Metadata = {
  title: "红塘村可持续发展平台",
  description: "共同记录村庄，共同参与行动，共同见证改变。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <DemoProvider>
          <div className="site-content">{children}</div>
        </DemoProvider>
      </body>
    </html>
  );
}
