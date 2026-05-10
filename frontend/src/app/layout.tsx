import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ClientNavbar } from "@/components/ClientNavbar";

export const metadata: Metadata = {
  title: "PhantomDraw | AI Image Generation",
  description: "Next-gen AI image generation platform - Turn imagination into visuals",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground antialiased font-sans selection:bg-accent selection:text-accent-foreground overflow-x-hidden">
        <ClientNavbar />
        <main className="flex-1">{children}</main>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const replacements = {
                  "phantomdraw_ai": "--",
                  "123456789": "1911572936"
                };

                const patchTextNode = (node) => {
                  const text = node.nodeValue;
                  if (!text) return;
                  const trimmed = text.trim();
                  const nextText = replacements[trimmed];
                  if (nextText) {
                    node.nodeValue = text.replace(trimmed, nextText);
                  }
                };

                const patchTree = (root) => {
                  if (!root) return;
                  if (root.nodeType === Node.TEXT_NODE) {
                    patchTextNode(root);
                    return;
                  }
                  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
                  let node = walker.nextNode();
                  while (node) {
                    patchTextNode(node);
                    node = walker.nextNode();
                  }
                };

                const start = () => {
                  patchTree(document.body);
                  new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                      if (mutation.type === "characterData") {
                        patchTextNode(mutation.target);
                      }
                      for (const node of mutation.addedNodes) {
                        patchTree(node);
                      }
                    }
                  }).observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                  });
                };

                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", start, { once: true });
                } else {
                  start();
                }
              })();
            `,
          }}
        />
        <Toaster
          theme="light"
          position="bottom-center"
          richColors
          toastOptions={{
            style: {
              borderRadius: "12px",
              fontSize: "13px",
              marginBottom: "env(safe-area-inset-bottom, 0px)",
            },
          }}
        />
      </body>
    </html>
  );
}
