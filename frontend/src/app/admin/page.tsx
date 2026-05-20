"use client";

import { useEffect, useState } from "react";
import { fetchAdminApi } from "@/lib/api";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, Settings } from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState<{ message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { role } = useAdminAuthStore();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetchAdminApi("/admin/dashboard");
        setData(res);
      } catch (error: unknown) {
        toast.error("加载仪表盘失败: " + (error instanceof Error ? error.message : String(error)));
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleTestSuperAdmin = async () => {
    try {
      const res = await fetchAdminApi("/admin/settings", {
        method: "POST",
        body: JSON.stringify({ theme: "dark" }),
      });
      toast.success(res.message);
    } catch (error: unknown) {
      toast.error("操作失败: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold tracking-tight text-slate-800">控制台仪表盘</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-white/10 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">系统状态</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">运行正常</div>
            <p className="text-xs text-slate-500 mt-1">后端服务已连接</p>
          </CardContent>
        </Card>
        
        <Card className="border-white/10 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">欢迎消息</CardTitle>
            <Settings className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-800">{data?.message || "暂无数据"}</div>
            <p className="text-xs text-slate-500 mt-1">来自 /admin/dashboard 接口</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">快捷操作</CardTitle>
            <CardDescription className="text-slate-500">测试基于角色的访问控制和审计日志记录。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleTestSuperAdmin} 
              disabled={role !== 'superadmin'}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900"
            >
              测试超级管理员操作 (POST /settings)
            </Button>
            {role !== 'superadmin' && (
              <p className="text-sm text-red-500">您需要超级管理员权限才能执行此操作。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
