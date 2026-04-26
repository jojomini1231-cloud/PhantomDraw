"use client";

import { useState, useEffect } from "react";
import { fetchAdminApi } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Search, Image as ImageIcon, Trash2, Power, PowerOff, Edit2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
  promptZh: string;
  promptEn: string;
  category: string;
  type: string; // 'free' | 'paid'
  unlockQuota: number;
  isActive: boolean;
  createdAt: string;
}

export default function GalleryManagement() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    imageUrl: "",
    title: "",
    promptZh: "",
    promptEn: "",
    category: "人物", // Default category
    type: "free",     // 'free' or 'paid'
    unlockQuota: 0,
    isActive: true,
  });

  const CATEGORIES = ["人物", "风景", "建筑", "二次元", "3D", "摄影", "其他"];

  const fetchGallery = async (pageNum = 1, searchQuery = search) => {
    try {
      setLoading(true);
      const res = await fetchAdminApi(`/admin/gallery?page=${pageNum}&limit=10&search=${searchQuery}`);
      setItems(res.items);
      setTotalPages(res.totalPages);
      setPage(pageNum);
    } catch (error: any) {
      toast.error("获取画廊列表失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchGallery(1, search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleSubmit = async () => {
    if (!formData.imageUrl || !formData.promptZh || !formData.promptEn || !formData.title) {
      toast.error("图片链接、标题和中英文提示词不能为空");
      return;
    }
    if (formData.type === "paid" && formData.unlockQuota <= 0) {
      toast.error("付费模式下需要填写大于0的解锁额度");
      return;
    }

    try {
      if (editingItem) {
        await fetchAdminApi(`/admin/gallery/${editingItem.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        toast.success("画廊项更新成功");
      } else {
        await fetchAdminApi("/admin/gallery", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        toast.success("画廊项添加成功");
      }
      setIsFormOpen(false);
      fetchGallery(page);
    } catch (error: any) {
      toast.error("操作失败: " + error.message);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetchAdminApi(`/admin/gallery/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      toast.success(`状态已${!currentStatus ? '启用' : '禁用'}`);
      fetchGallery(page);
    } catch (error: any) {
      toast.error("操作失败: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要永久删除此画廊项吗？此操作不可恢复。")) return;
    try {
      await fetchAdminApi(`/admin/gallery/${id}`, {
        method: "DELETE",
      });
      toast.success("画廊项已删除");
      fetchGallery(page);
    } catch (error: any) {
      toast.error("删除失败: " + error.message);
    }
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData({
      imageUrl: "",
      title: "",
      promptZh: "",
      promptEn: "",
      category: CATEGORIES[0],
      type: "free",
      unlockQuota: 0,
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const openEditDialog = (item: GalleryItem) => {
    setEditingItem(item);
    setFormData({
      imageUrl: item.imageUrl || "",
      title: item.title || "",
      promptZh: item.promptZh || "",
      promptEn: item.promptEn || "",
      category: item.category || CATEGORIES[0],
      type: item.type || "free",
      unlockQuota: item.unlockQuota || 0,
      isActive: item.isActive,
    });
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">灵感画廊管理</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={openCreateDialog} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            新增画廊项
          </Button>
        </div>
      </div>

      <Card className="border-white/10 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-slate-500" />
              画廊列表
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索提示词或 ID..."
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
                  <th className="px-6 py-4 font-medium w-24">预览</th>
                  <th className="px-6 py-4 font-medium">标题</th>
                  <th className="px-6 py-4 font-medium">中文提示词</th>
                  <th className="px-6 py-4 font-medium">分类/类型</th>
                  <th className="px-6 py-4 font-medium">状态</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      未找到画廊项
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.imageUrl} 
                          alt={item.title || item.promptZh} 
                          className="h-12 w-12 object-cover rounded-md border border-slate-200"
                          onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100?text=Error')}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{item.title}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="truncate font-medium text-slate-700" title={item.promptZh}>
                          {item.promptZh}
                        </div>
                        <div className="truncate text-xs text-slate-500 mt-1" title={item.promptEn}>
                          EN: {item.promptEn}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        <div className="mb-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                            {item.category}
                          </span>
                        </div>
                        <div>
                          {item.type === 'free' ? (
                            <span className="text-emerald-600 font-medium">免费</span>
                          ) : (
                            <span className="text-amber-600 font-medium">
                              付费 ({item.unlockQuota} 额度)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {item.isActive ? '已展示' : '已隐藏'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-blue-600"
                          onClick={() => openEditDialog(item)}
                          title="编辑"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 ${item.isActive ? 'text-slate-500 hover:text-amber-600' : 'text-slate-500 hover:text-emerald-600'}`}
                          onClick={() => handleToggleStatus(item.id, item.isActive)}
                          title={item.isActive ? "隐藏" : "展示"}
                        >
                          {item.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(item.id)}
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
                  onClick={() => fetchGallery(page - 1)} 
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchGallery(page + 1)} 
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "编辑画廊项" : "新增画廊项"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">图片 URL <span className="text-red-500">*</span></label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.png"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">标题 <span className="text-red-500">*</span></label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：赛博朋克城市"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">中文提示词 <span className="text-red-500">*</span></label>
              <Textarea
                value={formData.promptZh}
                onChange={(e) => setFormData({ ...formData, promptZh: e.target.value })}
                placeholder="例如：一个美丽的风景..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">英文提示词 <span className="text-red-500">*</span></label>
              <Textarea
                value={formData.promptEn}
                onChange={(e) => setFormData({ ...formData, promptEn: e.target.value })}
                placeholder="e.g. a beautiful landscape..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">分类 <span className="text-red-500">*</span></label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value || "" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">类型 <span className="text-red-500">*</span></label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => {
                    setFormData({ 
                      ...formData, 
                      type: value || 'free',
                      unlockQuota: value === 'free' ? 0 : (formData.unlockQuota > 0 ? formData.unlockQuota : 10)
                    })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">免费</SelectItem>
                    <SelectItem value="paid">付费</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'paid' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">解锁额度 <span className="text-red-500">*</span></label>
                <Input
                  type="number"
                  value={formData.unlockQuota}
                  onChange={(e) => setFormData({ ...formData, unlockQuota: Number(e.target.value) })}
                  min={1}
                />
                <p className="text-xs text-slate-500">用户解锁此作品需要消耗的积分或额度。</p>
              </div>
            )}

            {!editingItem && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-700">创建后直接展示 (已启用)</label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              {editingItem ? "保存修改" : "确认添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
