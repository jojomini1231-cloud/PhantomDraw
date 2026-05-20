"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAdminApi } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BrainCircuit,
  Edit2,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
} from "lucide-react";

interface ModelConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface ModelListResponse {
  items: ModelConfig[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误";
}

const emptyModel: Partial<ModelConfig> = {
  slug: "",
  name: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

export default function ModelsManagement() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentModel, setCurrentModel] = useState<Partial<ModelConfig>>(emptyModel);

  const fetchModels = useCallback(
    async (pageNum = 1, searchQuery = search) => {
      try {
        setLoading(true);
        const res = await fetchAdminApi<ModelListResponse>(
          `/admin/models?page=${pageNum}&limit=10&search=${encodeURIComponent(searchQuery)}`,
        );
        setModels(res.items);
        setTotalPages(res.totalPages);
        setPage(pageNum);
      } catch (error: unknown) {
        toast.error("获取模型列表失败: " + getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      void fetchModels(1, search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchModels, search]);

  const openCreateDialog = () => {
    setCurrentModel(emptyModel);
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (model: ModelConfig) => {
    setCurrentModel(model);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      slug: currentModel.slug?.trim(),
      name: currentModel.name?.trim(),
      description: currentModel.description?.trim() || "",
      sortOrder: Number(currentModel.sortOrder ?? 0),
      isActive: currentModel.isActive ?? true,
    };

    if (!payload.slug || !payload.name) {
      toast.error("请填写模型名称和模型标识");
      return;
    }

    try {
      if (isEditMode && currentModel.id) {
        await fetchAdminApi(`/admin/models/${currentModel.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("模型更新成功");
      } else {
        await fetchAdminApi("/admin/models", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("模型添加成功");
      }
      setIsDialogOpen(false);
      void fetchModels(page);
    } catch (error: unknown) {
      toast.error("保存失败: " + getErrorMessage(error));
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetchAdminApi(`/admin/models/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      toast.success(`模型已${!currentStatus ? "启用" : "禁用"}`);
      void fetchModels(page);
    } catch (error: unknown) {
      toast.error("操作失败: " + getErrorMessage(error));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要永久删除此模型吗？供应商中已选择的同名模型不会自动移除。")) {
      return;
    }

    try {
      await fetchAdminApi(`/admin/models/${id}`, {
        method: "DELETE",
      });
      toast.success("模型已删除");
      void fetchModels(page);
    } catch (error: unknown) {
      toast.error("删除失败: " + getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">模型管理</h2>
          <p className="text-sm text-slate-500">
            维护用户端模型引擎和供应商支持模型的统一来源。
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          添加模型
        </Button>
      </div>

      <Card className="border-white/10 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <BrainCircuit className="h-5 w-5 text-slate-500" />
              模型列表
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索名称、标识或说明..."
                className="bg-slate-50 pl-9 border-slate-200 focus-visible:ring-slate-400"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">模型</th>
                  <th className="px-6 py-4 font-medium">标识</th>
                  <th className="px-6 py-4 font-medium">说明</th>
                  <th className="px-6 py-4 font-medium">排序</th>
                  <th className="px-6 py-4 font-medium">状态</th>
                  <th className="px-6 py-4 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
                    </td>
                  </tr>
                ) : models.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      未找到模型
                    </td>
                  </tr>
                ) : (
                  models.map((model) => (
                    <tr key={model.id} className="bg-white transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-slate-800">{model.name}</td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          {model.slug}
                        </code>
                      </td>
                      <td className="max-w-[320px] px-6 py-4 text-slate-500">
                        <span className="line-clamp-2">{model.description || "-"}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{model.sortOrder}</td>
                      <td className="px-6 py-4">
                        <Badge variant={model.isActive ? "success" : "outline"}>
                          {model.isActive ? "已启用" : "已禁用"}
                        </Badge>
                      </td>
                      <td className="space-x-2 whitespace-nowrap px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600"
                          onClick={() => openEditDialog(model)}
                          title="编辑"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${
                            model.isActive
                              ? "text-slate-500 hover:text-amber-600"
                              : "text-slate-500 hover:text-emerald-600"
                          }`}
                          onClick={() => void handleToggleStatus(model.id, model.isActive)}
                          title={model.isActive ? "禁用" : "启用"}
                        >
                          {model.isActive ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => void handleDelete(model.id)}
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

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
              <span className="text-sm text-slate-500">
                第 {page} 页，共 {totalPages} 页
              </span>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchModels(page - 1)}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchModels(page + 1)}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "编辑模型" : "添加模型"}</DialogTitle>
            <DialogDescription>
              模型标识会作为调用接口时的 model 值，请保持与供应商 API 要求一致。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">模型名称</label>
              <Input
                placeholder="例如：GPT-Image-2"
                value={currentModel.name || ""}
                onChange={(event) =>
                  setCurrentModel({ ...currentModel, name: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">模型标识</label>
              <Input
                placeholder="例如：gpt-image-2"
                value={currentModel.slug || ""}
                onChange={(event) =>
                  setCurrentModel({ ...currentModel, slug: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">说明</label>
              <Input
                placeholder="展示在用户端模型卡片下方"
                value={currentModel.description || ""}
                onChange={(event) =>
                  setCurrentModel({ ...currentModel, description: event.target.value })
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">排序</label>
                <Input
                  type="number"
                  value={currentModel.sortOrder ?? 0}
                  onChange={(event) =>
                    setCurrentModel({
                      ...currentModel,
                      sortOrder: Number(event.target.value),
                    })
                  }
                />
              </div>
              <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700">
                <Checkbox
                  checked={currentModel.isActive ?? true}
                  onCheckedChange={(checked) =>
                    setCurrentModel({ ...currentModel, isActive: Boolean(checked) })
                  }
                />
                启用
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleSave()} className="bg-blue-600 hover:bg-blue-700">
              {isEditMode ? "保存修改" : "确认添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
