"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  LayoutGrid,
  LogOut,
  Settings,
  Key,
  User,
  Hexagon,
  History,
  Sparkles,
  Sun,
  Coins,
  Globe,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

function maskKey(key: string | null): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { token, apiKey, quota, logout } = useAuthStore();
  const { language, toggleLanguage } = useLangStore();
  const t = translations[language];
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success(t.msgLogoutSuccess);
    router.push("/login");
  };

  const handleCopyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success(t.msgKeyCopied);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted || !token) return null;

  const navItems = [
    { href: "/", label: t.navReady, icon: Sparkles },
    { href: "/history", label: t.navHistory, icon: History },
    { href: "/gallery", label: t.navGallery, icon: LayoutGrid },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-xl">
      <div className="flex h-14 items-center px-4 lg:px-6 w-full max-w-[1920px] mx-auto">
        {/* Left: Logo */}
        <div className="flex items-center w-auto lg:w-64 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-primary rounded-lg p-1.5 group-hover:bg-brand transition-colors duration-200">
              <Hexagon className="h-4 w-4 text-primary-foreground fill-primary-foreground/20" />
            </div>
            <span className="font-bold tracking-tight text-base hidden sm:block">
              PhantomDraw
            </span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <div className="flex-1 flex justify-center">
          <nav className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-all duration-200 px-3 lg:px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 ${
                    isActive
                      ? "bg-white text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center justify-end gap-2 w-auto lg:w-64 shrink-0">
          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-2">
            {/* Model badge */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-md border border-border/50">
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              <span className="hidden lg:inline">GPT-Image-2</span>
            </div>

            {/* Quota */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-md border border-border/50">
              <Coins className="h-3 w-3 text-brand" />
              <span>{quota}</span>
            </div>

            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-md border border-border/50 hover:bg-muted hover:text-foreground transition-colors"
            >
              <Globe className="h-3 w-3" />
              <span>{language === "zh" ? "EN" : "中文"}</span>
            </button>

            {/* Key status */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-md border border-border/50">
              <Key className="h-3 w-3 text-emerald-500" />
              <span className="hidden lg:inline">{t.navKeyConfigured}</span>
            </div>
          </div>

          {/* Account dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 h-8 px-2 rounded-lg border border-border bg-white hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
              <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" sideOffset={8}>
              <DropdownMenuLabel className="font-normal px-3 py-2.5">
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-semibold">{t.accountTitle}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t.accountKeyLabel}:
                    </span>
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {maskKey(apiKey)}
                    </code>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCopyKey}
                className="cursor-pointer px-3 py-2"
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                <span>{t.navCopyKey}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer px-3 py-2">
                <Settings className="mr-2 h-4 w-4" />
                <span>{t.navPreferences}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive cursor-pointer px-3 py-2 focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t.navLogout}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
