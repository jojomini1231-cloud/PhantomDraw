"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { ShieldAlert, Loader2, Key, LayoutDashboard, Image as ImageIcon, Server, FileText, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, role, logoutAdmin } = useAdminAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (mounted) {
      const isLoginPage = pathname === "/admin/login";
      if (!token && !isLoginPage) {
        router.replace("/admin/login");
      } else if (token && isLoginPage) {
        router.replace("/admin");
      }
    }
  }, [mounted, token, pathname, router]);

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-red-500 p-2 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">管理控制台</h1>
            {role === 'superadmin' && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase tracking-wider">超管</span>
            )}
          </div>
          
          <nav className="hidden md:flex items-center gap-1 ml-6 border-l border-slate-200 pl-6">
            <Link href="/admin">
              <Button variant={pathname === "/admin" ? "secondary" : "ghost"} className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                仪表盘
              </Button>
            </Link>
            <Link href="/admin/keys">
              <Button variant={pathname === "/admin/keys" ? "secondary" : "ghost"} className="gap-2">
                <Key className="h-4 w-4" />
                密钥管理
              </Button>
            </Link>
            <Link href="/admin/accounts">
              <Button variant={pathname === "/admin/accounts" ? "secondary" : "ghost"} className="gap-2">
                <Key className="h-4 w-4" />
                号池管理
              </Button>
            </Link>
            <Link href="/admin/gallery">
              <Button variant={pathname === "/admin/gallery" ? "secondary" : "ghost"} className="gap-2">
                <ImageIcon className="h-4 w-4" />
                灵感画廊
              </Button>
            </Link>
            <Link href="/admin/providers">
              <Button variant={pathname === "/admin/providers" ? "secondary" : "ghost"} className="gap-2">
                <Server className="h-4 w-4" />
                供应商管理
              </Button>
            </Link>
            <Link href="/admin/models">
              <Button variant={pathname === "/admin/models" ? "secondary" : "ghost"} className="gap-2">
                <BrainCircuit className="h-4 w-4" />
                模型管理
              </Button>
            </Link>
            <Link href="/admin/generation-logs">
              <Button variant={pathname === "/admin/generation-logs" ? "secondary" : "ghost"} className="gap-2">
                <FileText className="h-4 w-4" />
                调用日志
              </Button>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            onClick={() => {
              logoutAdmin();
              router.push("/admin/login");
            }}
          >
            退出登录
          </Button>
        </div>
      </header>
      <div className="flex-1 max-w-7xl w-full mx-auto p-6">
        {children}
      </div>
    </div>
  );
}
