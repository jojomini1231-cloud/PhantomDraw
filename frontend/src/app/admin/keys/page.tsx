"use client";

import { useState, useEffect } from "react";
import { fetchAdminApi } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Search, Key, Download, Trash2, Power, PowerOff, Edit2 } from "lucide-react";

interface ApiKey {
  id: string;
  key: string;
  quota: number;
  isActive: boolean;
  createdAt: string;
}

export default function ApiKeysManagement() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createQuota, setCreateQuota] = useState(100);
  const [editKey, setEditKey] = useState<ApiKey | null>(null);
  const [editQuota, setEditQuota] = useState(0);

  const fetchKeys = async (pageNum = 1, searchQuery = search) => {
    try {
      setLoading(true);
      const res = await fetchAdminApi(`/admin/api-keys?page=${pageNum}&limit=10&search=${searchQuery}`);
      setKeys(res.items);
      setTotalPages(res.totalPages);
      setPage(pageNum);
    } catch (error: any) {
      toast.error("获取密钥列表失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchKeys(1, search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleCreate = async () => {
    try {
      await fetchAdminApi("/admin/api-keys", {
        method: "POST",
        body: JSON.stringify({ quota: createQuota }),
      });
      toast.success("密钥生成成功");
      setIsCreateOpen(false);
      setCreateQuota(100);
      fetchKeys(page);
    } catch (error: any) {
      toast.error("生成失败: " + error.message);
    }
  };

  const handleUpdateQuota = async () => {
    if (!editKey) return;
    try {
      await fetchAdminApi(`/admin/api-keys/${editKey.id}/quota`, {
        method: "PUT",
        body: JSON.stringify({ quota: editQuota }),
      });
      toast.success("配额更新成功");
      setIsEditOpen(false);
      fetchKeys(page);
    } catch (error: any) {
      toast.error("更新失败: " + error.message);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetchAdminApi(`/admin/api-keys/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      toast.success(`密钥已${!currentStatus ? '启用' : '禁用'}`);
      fetchKeys(page);
    } catch (error: any) {
      toast.error("操作失败: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要永久删除此密钥吗？此操作不可恢复。")) return;
    try {
      await fetchAdminApi(`/admin/api-keys/${id}`, {
        method: "DELETE",
      });
      toast.success("密钥已删除");
      fetchKeys(page);
    } catch (error: any) {
      toast.error("删除失败: " + error.message);
    }
  };

  const handleExport = async () => {
    try {
      const data = await fetchAdminApi("/admin/api-keys/export");
      const csvContent = [
        ["ID", "Key", "Quota", "Status", "Created At"],
        ...data.map((item: ApiKey) => [
          item.id,
          item.key,
          item.quota.toString(),
          item.isActive ? "Active" : "Disabled",
          new Date(item.createdAt).toISOString()
        ])
      ].map(e => e.join(",")).join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `api-keys-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      toast.error("导出失败: " + error.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">密钥管理</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            导出 CSV
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            生成新密钥
          </Button>
        </div>
      </div>

      <Card className="border-white/10 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Key className="h-5 w-5 text-slate-500" />
              API 密钥列表
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索密钥或 ID..."
                className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">密钥 (Key)</th>
                  <th className="px-6 py-4 font-medium">配额 (Quota)</th>
                  <th className="px-6 py-4 font-medium">状态</th>
                  <th className="px-6 py-4 font-medium">创建时间</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                    </td>
                  </tr>
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      未找到匹配的密钥
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => (
                    <tr key={key.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-700">{key.key}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {key.quota}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${key.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {key.isActive ? '已启用' : '已禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(key.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-blue-600"
                          onClick={() => {
                            setEditKey(key);
                            setEditQuota(key.quota);
                            setIsEditOpen(true);
                          }}
                          title="修改配额"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 ${key.isActive ? 'text-slate-500 hover:text-amber-600' : 'text-slate-500 hover:text-emerald-600'}`}
                          onClick={() => handleToggleStatus(key.id, key.isActive)}
                          title={key.isActive ? "禁用" : "启用"}
                        >
                          {key.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(key.id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <span className="text-sm text-slate-500">
                第 {page} 页，共 {totalPages} 页
              </span>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchKeys(page - 1)} 
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchKeys(page + 1)} 
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>生成新密钥</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">初始配额</label>
              <Input
                type="number"
                value={createQuota}
                onChange={(e) => setCreateQuota(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-slate-500">生成的密钥将默认处于启用状态。</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">确认生成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quota Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>修改配额</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">密钥</label>
              <Input value={editKey?.key || ''} disabled className="bg-slate-50 text-slate-500 font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">新配额</label>
              <Input
                type="number"
                value={editQuota}
                onChange={(e) => setEditQuota(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>取消</Button>
            <Button onClick={handleUpdateQuota} className="bg-blue-600 hover:bg-blue-700">保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
