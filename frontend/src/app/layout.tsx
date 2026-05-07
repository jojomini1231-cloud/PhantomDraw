import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ClientNavbar } from "@/components/ClientNavbar";

export const metadata: Metadata = {
  title: "PhantomDraw | AI Image Generation",
  description: "Next-gen AI image generation platform - Turn imagination into visuals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased font-sans selection:bg-accent selection:text-accent-foreground">
        <ClientNavbar />
        <main className="flex-1">{children}</main>
        <Toaster
          theme="light"
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              borderRadius: "12px",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
