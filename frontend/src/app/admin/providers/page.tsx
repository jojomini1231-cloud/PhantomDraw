"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAdminApi } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Search, Server, Trash2, Edit2, Power, PowerOff } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  key: string;
  model: string;
  isActive: boolean;
  createdAt: string;
}

interface ProviderListResponse {
  items: Provider[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ModelOption {
  id: string;
  slug: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误";
}

export default function ProvidersManagement() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<Partial<Provider>>({
    name: "",
    baseUrl: "",
    key: "",
    model: "",
    isActive: true,
  });

  const fetchProviders = useCallback(async (pageNum = 1, searchQuery = search) => {
    try {
      setLoading(true);
      const res = await fetchAdminApi<ProviderListResponse>(
        `/admin/providers?page=${pageNum}&limit=10&search=${encodeURIComponent(searchQuery)}`,
      );
      setProviders(res.items);
      setTotalPages(res.totalPages);
      setPage(pageNum);
    } catch (error: unknown) {
      toast.error("获取供应商列表失败: " + getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchModelOptions = useCallback(async () => {
    try {
      const models = await fetchAdminApi<ModelOption[]>("/admin/models/options");
      setModelOptions(models);
    } catch (error: unknown) {
      toast.error("获取模型选项失败: " + getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      void fetchProviders(1, search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchProviders, search]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void fetchModelOptions();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fetchModelOptions]);

  const parseModelSlugs = (value?: string) =>
    (value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const getModelOption = (slug: string) =>
    modelOptions.find((model) => model.slug === slug);

  const toggleProviderModel = (slug: string, checked: boolean) => {
    const selected = parseModelSlugs(currentProvider.model);
    const next = checked
      ? Array.from(new Set([...selected, slug]))
      : selected.filter((item) => item !== slug);

    setCurrentProvider({ ...currentProvider, model: next.join(",") });
  };

  const renderModelBadges = (modelValue: string) => {
    const slugs = parseModelSlugs(modelValue);

    if (slugs.length === 0) {
      return <span className="text-slate-400">未配置</span>;
    }

    return (
      <div className="flex max-w-[320px] flex-wrap gap-1.5">
        {slugs.map((slug) => {
          const option = getModelOption(slug);

          return (
            <Badge
              key={slug}
              variant={option?.isActive === false ? "outline" : "secondary"}
              className="max-w-full"
              title={slug}
            >
              <span className="truncate">{option?.name || slug}</span>
            </Badge>
          );
        })}
      </div>
    );
  };

  const handleSave = async () => {
    try {
      if (isEditMode && currentProvider.id) {
        await fetchAdminApi(`/admin/providers/${currentProvider.id}`, {
          method: "PUT",
          body: JSON.stringify(currentProvider),
        });
        toast.success("供应商更新成功");
      } else {
        await fetchAdminApi("/admin/providers", {
          method: "POST",
          body: JSON.stringify(currentProvider),
        });
        toast.success("供应商添加成功");
      }
      setIsDialogOpen(false);
      void fetchProviders(page);
    } catch (error: unknown) {
      toast.error("保存失败: " + getErrorMessage(error));
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetchAdminApi(`/admin/providers/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      toast.success(`供应商已${!currentStatus ? '启用' : '禁用'}`);
      void fetchProviders(page);
    } catch (error: unknown) {
      toast.error("操作失败: " + getErrorMessage(error));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要永久删除此供应商吗？此操作不可恢复。")) return;
    try {
      await fetchAdminApi(`/admin/providers/${id}`, {
        method: "DELETE",
      });
      toast.success("供应商已删除");
      void fetchProviders(page);
    } catch (error: unknown) {
      toast.error("删除失败: " + getErrorMessage(error));
    }
  };

  const openCreateDialog = () => {
    setCurrentProvider({
      name: "",
      baseUrl: "",
      key: "",
      model: "",
      isActive: true,
    });
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (provider: Provider) => {
    setCurrentProvider(provider);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">供应商管理</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={openCreateDialog} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            添加供应商
          </Button>
        </div>
      </div>

      <Card className="border-white/10 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Server className="h-5 w-5 text-slate-500" />
              API 供应商列表
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索名称, URL或模型..."
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
                  <th className="px-6 py-4 font-medium">名称</th>
                  <th className="px-6 py-4 font-medium">Base URL</th>
                  <th className="px-6 py-4 font-medium">模型</th>
                  <th className="px-6 py-4 font-medium">状态</th>
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
                ) : providers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      未找到供应商
                    </td>
                  </tr>
                ) : (
                  providers.map((provider) => (
                    <tr key={provider.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{provider.name}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate" title={provider.baseUrl}>{provider.baseUrl}</td>
                      <td className="px-6 py-4 text-slate-500">{renderModelBadges(provider.model)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${provider.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {provider.isActive ? '已启用' : '已禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-blue-600"
                          onClick={() => openEditDialog(provider)}
                          title="编辑"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 ${provider.isActive ? 'text-slate-500 hover:text-amber-600' : 'text-slate-500 hover:text-emerald-600'}`}
                          onClick={() => handleToggleStatus(provider.id, provider.isActive)}
                          title={provider.isActive ? "禁用" : "启用"}
                        >
                          {provider.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(provider.id)}
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
                  onClick={() => fetchProviders(page - 1)} 
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchProviders(page + 1)} 
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "编辑供应商" : "添加供应商"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">供应商名称</label>
              <Input
                placeholder="例如：OpenAI, Anthropic"
                value={currentProvider.name || ""}
                onChange={(e) => setCurrentProvider({ ...currentProvider, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Base URL (base_url)</label>
              <Input
                placeholder="https://api.openai.com/v1"
                value={currentProvider.baseUrl || ""}
                onChange={(e) => setCurrentProvider({ ...currentProvider, baseUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">API 密钥 (key)</label>
              <Input
                type="password"
                placeholder="sk-..."
                value={currentProvider.key || ""}
                onChange={(e) => setCurrentProvider({ ...currentProvider, key: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">支持的模型 (model)</label>
              {modelOptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  暂无模型选项，请先到模型管理中添加模型。
                </div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  {modelOptions.map((model) => {
                    const checked = parseModelSlugs(currentProvider.model).includes(model.slug);

                    return (
                      <label
                        key={model.id}
                        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleProviderModel(model.slug, Boolean(value))
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-800">
                              {model.name}
                            </span>
                            {!model.isActive && (
                              <Badge variant="outline" className="shrink-0">
                                已禁用
                              </Badge>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-xs text-slate-500">
                            {model.slug}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-slate-500">
                选项来自模型管理；用户端只展示已启用模型。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {isEditMode ? "保存修改" : "确认添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
