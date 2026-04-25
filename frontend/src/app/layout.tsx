import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ClientNavbar } from "@/components/ClientNavbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PhantomDraw | AI Image Generation",
  description: "Next-gen AI image generation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-foreground antialiased selection:bg-primary selection:text-primary-foreground`}>
        <ClientNavbar />
        <main className="flex-1">
          {children}
        </main>
        <Toaster theme="light" position="bottom-right" richColors />
      </body>
    </html>
  );
}
