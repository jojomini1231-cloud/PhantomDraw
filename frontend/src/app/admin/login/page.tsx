"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminApi } from "@/lib/api";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAdminAuth = useAdminAuthStore((state) => state.setAdminAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    try {
      const data = await fetchAdminApi("/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      // Get role from decoded JWT token manually, or backend can return it.
      // Let's decode token on client side
      const tokenPayload = JSON.parse(atob(data.accessToken.split(".")[1]));
      const redirect =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirect")
          : null;
      const nextPath = redirect?.startsWith("/admin") ? redirect : "/admin";
      
      setAdminAuth(data.accessToken, username, tokenPayload.role);
      toast.success("管理员登录成功");
      router.push(nextPath);
    } catch (err: any) {
      toast.error(err.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-white/10 bg-slate-800 text-slate-100">
        <CardHeader className="space-y-1 text-center flex flex-col items-center">
          <div className="bg-red-500 p-3 rounded-xl mb-4 shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tighter">管理后台</CardTitle>
          <CardDescription className="text-slate-400">请输入您的凭据以访问系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">用户名</label>
              <Input
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-500 focus-visible:ring-offset-slate-900 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">密码</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-500 focus-visible:ring-offset-slate-900 transition-colors"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/20 transition-all" 
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "验证中..." : "登录"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
