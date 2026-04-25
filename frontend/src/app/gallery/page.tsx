"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Sparkles, Lock, Unlock, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  promptZh?: string;
  promptEn?: string;
  category: string;
  type: string;
  unlockQuota: number;
  isActive?: boolean;
  createdAt?: string;
  isUnlocked?: boolean;
}

export default function GalleryPage() {
  const { token, updateQuota, quota } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language];
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("全部");
  
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const CATEGORIES = ["全部", "人物", "风景", "建筑", "二次元", "3D", "摄影", "其他"];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/login");
    }
  }, [mounted, token, router]);

  const fetchGallery = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const url = activeCategory === "全部" 
        ? "/gallery?limit=50" 
        : `/gallery?limit=50&category=${encodeURIComponent(activeCategory)}`;
      const data = await fetchApi(url);
      setItems(data.items);
    } catch (err: any) {
      setError(err.message || "获取画廊失败");
      toast.error("获取画廊失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [token, activeCategory]);

  const handleCardClick = async (item: GalleryItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
    setDetailLoading(true);
    
    try {
      const data = await fetchApi(`/gallery/${item.id}`);
      setSelectedItem(data);
    } catch (err: any) {
      toast.error(err.message || "获取详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopy = (text: string, lang: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${language === 'zh' ? lang : ''} ${t.galCopied} ${language === 'en' ? lang : ''}`);
  };

  const handleUnlock = async (id: string, requiredQuota: number) => {
    if (quota < requiredQuota) {
      toast.error(t.galUnlockFail);
      return;
    }

    try {
      setUnlocking(true);
      const res = await fetchApi(`/gallery/${id}/unlock`, { method: "POST" });
      updateQuota(res.remainingQuota);
      toast.success(t.galUnlockSuccess);
      
      // Refresh the list to update lock status
      fetchGallery();
      
      // Refetch current details
      const data = await fetchApi(`/gallery/${id}`);
      setSelectedItem(data);
    } catch (err: any) {
      toast.error(err.message || "解锁失败");
    } finally {
      setUnlocking(false);
    }
  };

  const handleTryIt = (prompt: string) => {
    // navigator.clipboard.writeText(prompt); // Removed clipboard copy as we use query param now
    toast.info(t.galTryInfo);
    setIsDialogOpen(false);
    setTimeout(() => {
      // Use query parameter to pass the prompt to the workspace
      router.push(`/?prompt=${encodeURIComponent(prompt)}`);
    }, 300);
  };

  if (!mounted || !token) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">{t.galTitle}</h1>
        <p className="text-slate-500">{t.galSubtitle}</p>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <Button 
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"} 
            className={`rounded-full ${
              activeCategory === cat 
                ? "bg-slate-800 text-white hover:bg-slate-700" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === "全部" ? t.galAll : cat}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-500" />
          <p>加载中...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500 bg-red-50 rounded-2xl border border-red-100">
          <AlertCircle className="h-10 w-10 mb-4" />
          <p>{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-medium text-slate-700 mb-2">暂无画廊内容</h3>
          <p className="text-slate-500">该分类下暂无作品，去其他分类看看吧</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
          {items.map((item) => (
            <Card 
              key={item.id} 
              className="break-inside-avoid overflow-hidden border-border bg-card/50 hover:bg-card/80 transition-colors group cursor-pointer"
              onClick={() => handleCardClick(item)}
            >
              <div className="relative">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-auto object-cover min-h-[200px] bg-slate-100"
                  loading="lazy"
                />
                {!item.isUnlocked && (
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md rounded-full p-1.5 shadow-sm">
                    <Lock className="h-4 w-4 text-white/90" />
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base line-clamp-1 flex-1 mr-2 text-slate-800" title={item.title}>
                    {item.title}
                  </h3>
                  {item.type === 'free' ? (
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-md shrink-0">{t.galFree}</span>
                  ) : item.isUnlocked ? (
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-blue-500/10 text-blue-600 px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                      <Unlock className="h-3 w-3" /> {t.galUnlocked}
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[1100px] p-0 overflow-hidden bg-white border-slate-100 shadow-2xl">
          {selectedItem && (
            <div className="flex flex-col md:flex-row h-[85vh] sm:h-[80vh] max-h-[800px]">
              <div className="w-full md:w-[55%] bg-slate-100/50 relative min-h-[400px] md:min-h-full flex items-center justify-center">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="w-full h-full object-contain absolute inset-0 p-4"
                />
              </div>
              
              <div className="w-full md:w-[45%] p-6 md:p-8 flex flex-col h-full overflow-y-auto">
                <DialogHeader className="mb-4 text-left">
                  <DialogTitle className="text-2xl font-bold text-slate-800">{selectedItem.title}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-2">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium">{selectedItem.category}</span>
                    {selectedItem.type === 'free' ? (
                      <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                        <Unlock className="h-3 w-3" /> 免费
                      </span>
                    ) : selectedItem.isUnlocked ? (
                      <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                        <Unlock className="h-3 w-3" /> 已解锁
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                        <Lock className="h-3 w-3" /> 高级提示词
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex flex-col justify-center py-4">
                  {detailLoading ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-10">
                      <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                      <p className="text-sm">加载详情中...</p>
                    </div>
                  ) : !selectedItem.isUnlocked ? (
                    <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100 h-full">
                      <Lock className="h-12 w-12 text-slate-300 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">解锁提示词详情</h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-[250px]">
                        该作品使用了高级提示词，需要支付额度才能查看并使用。
                      </p>
                      <Button 
                        onClick={() => handleUnlock(selectedItem.id, selectedItem.unlockQuota)} 
                        className="w-full max-w-[200px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm h-11"
                        disabled={unlocking}
                      >
                        {unlocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                        支付 {selectedItem.unlockQuota} 额度解锁
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        {/* 英文提示词 */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-blue-500" />
                              英文提示词 (Prompt)
                            </span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleCopy(selectedItem.promptEn || '', 'English')}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              复制
                            </Button>
                          </h4>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                            <p 
                              className="text-sm leading-relaxed text-slate-600 break-words line-clamp-6"
                              title={selectedItem.promptEn || ''}
                            >
                              {selectedItem.promptEn || '暂无英文提示词'}
                            </p>
                          </div>
                        </div>

                        {/* 中文提示词 */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-blue-500" />
                              中文提示词
                            </span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleCopy(selectedItem.promptZh || '', 'Chinese')}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              复制
                            </Button>
                          </h4>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                            <p 
                              className="text-sm leading-relaxed text-slate-600 break-words line-clamp-4"
                              title={selectedItem.promptZh || ''}
                            >
                              {selectedItem.promptZh || '暂无中文提示词'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 mt-auto">
                        <Button 
                          onClick={() => handleTryIt(language === 'zh' ? selectedItem.promptZh! : selectedItem.promptEn!)} 
                          className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md transition-all text-base font-medium"
                        >
                          <Sparkles className="h-4 w-4 mr-2 text-blue-400" />
                          {t.galTryPrompt}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
