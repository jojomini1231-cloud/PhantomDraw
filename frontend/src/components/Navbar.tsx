"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, LayoutGrid, LogOut, Settings, Key, User, Hexagon, History, Sparkles, Sun, Coins, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { token, apiKey, quota, logout } = useAuthStore();
  const { language, toggleLanguage } = useLangStore();
  const t = translations[language];
  const [mounted, setMounted] = useState(false);

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
      toast.success(t.msgKeyCopied);
    }
  };

  if (!mounted || !token) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-14 items-center px-4 w-full">
        {/* Left: Logo */}
        <div className="flex items-center w-64">
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-blue-500 rounded-lg p-1">
              <Hexagon className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="font-bold tracking-tight text-lg text-slate-800">PhantomDraw</span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <div className="flex-1 flex justify-center">
          <nav className="flex items-center space-x-1 bg-slate-100/50 p-1 rounded-full border border-slate-200">
            <Link
              href="/"
              className={`transition-colors px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
                pathname === "/" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              {t.navReady}
            </Link>
            <Link
              href="/history"
              className={`transition-colors px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
                pathname?.startsWith("/history") ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="h-4 w-4" />
              {t.navHistory}
            </Link>
            <Link
              href="/gallery"
              className={`transition-colors px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
                pathname?.startsWith("/gallery") ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              {t.navGallery}
            </Link>
          </nav>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center justify-end space-x-3 w-auto min-w-80">
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              VISION XL V2
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <Coins className="h-3 w-3 text-blue-500" />
              {quota}
            </div>
            <button 
              onClick={toggleLanguage}
              className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              {language === 'zh' ? 'EN' : '中'}
            </button>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <Key className="h-3 w-3" />
              {t.navKeyConfigured}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-slate-200 bg-white">
              <Sun className="h-4 w-4 text-slate-600" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="relative h-8 w-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors focus:outline-none">
              <User className="h-4 w-4 text-slate-600" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{t.navAccountSettings}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {apiKey}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopyKey} className="cursor-pointer">
                <Key className="mr-2 h-4 w-4" />
                <span>{t.navCopyKey}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>{t.navPreferences}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 cursor-pointer">
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
