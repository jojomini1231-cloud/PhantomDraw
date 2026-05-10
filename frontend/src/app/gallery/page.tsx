"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Sparkles,
  Lock,
  Unlock,
  Loader2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  LayoutGrid,
  Eye,
} from "lucide-react";
import Link from "next/link";
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

  const CATEGORIES = [
    { key: "全部", label: t.galAll },
    { key: "人物", label: t.galCharacters },
    { key: "风景", label: t.galScenery },
    { key: "建筑", label: t.galArchitecture },
    { key: "二次元", label: t.galAnime },
    { key: "3D", label: t.gal3D },
    { key: "摄影", label: t.galPhotography },
    { key: "其他", label: t.galOther },
  ];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const fetchGallery = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        activeCategory === "全部"
          ? "/gallery?limit=50"
          : `/gallery?limit=50&category=${encodeURIComponent(activeCategory)}`;
      const data = await fetchApi(url);
      setItems(data.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load gallery");
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void fetchGallery();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fetchGallery]);

  const handleCardClick = async (item: GalleryItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
    setDetailLoading(true);

    try {
      const data = await fetchApi(`/gallery/${item.id}`);
      setSelectedItem(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t.galCopied);
  };

  const handleUnlock = async (id: string, requiredQuota: number) => {
    if (!token) {
      toast.info(t.galLoginRequired);
      router.push("/login?redirect=%2Fgallery");
      return;
    }

    if (quota < requiredQuota) {
      toast.error(t.galUnlockFail);
      return;
    }

    try {
      setUnlocking(true);
      const res = await fetchApi(`/gallery/${id}/unlock`, { method: "POST" });
      updateQuota(res.remainingQuota);
      toast.success(t.galUnlockSuccess);

      fetchGallery();

      const data = await fetchApi(`/gallery/${id}`);
      setSelectedItem(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setUnlocking(false);
    }
  };

  const handleTryIt = (prompt: string) => {
    toast.info(t.galTryInfo);
    setIsDialogOpen(false);
    setTimeout(() => {
      router.push(`/?prompt=${encodeURIComponent(prompt)}`);
    }, 300);
  };

  if (!mounted) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-canvas">
      <div className="container mx-auto px-4 lg:px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-purple/10 flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-purple" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t.galTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t.galSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                activeCategory === cat.key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-white text-muted-foreground border-border active:text-foreground active:border-foreground/20 sm:hover:text-foreground sm:hover:border-foreground/20"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Loader2 className="h-7 w-7 animate-spin text-purple" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {t.galLoading}
            </p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-32">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{t.galErrorTitle}</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
              {error.includes("401") || error.includes("Unauthorized")
                ? t.galUnauthorizedDesc
                : t.galErrorDesc}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={fetchGallery}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {t.galRetry}
              </Button>
              <Button render={<Link href="/" />}>
                <ArrowRight className="h-4 w-4 mr-1.5" />
                {t.galBackToWork}
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-32">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple/10 to-brand/10 flex items-center justify-center mb-6 border border-purple/10">
              <Sparkles className="h-8 w-8 text-purple" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{t.galEmpty}</h3>
            <p className="text-sm text-muted-foreground max-w-sm text-center">
              {t.galEmptyDesc}
            </p>
          </div>
        ) : (
          /* Masonry Grid */
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 lg:gap-5 space-y-4 lg:space-y-5">
            {items.map((item) => (
              <div
                key={item.id}
                className="break-inside-avoid overflow-hidden rounded-xl bg-white border border-border shadow-sm transition-all duration-200 group cursor-pointer active:shadow-md sm:hover:shadow-md"
                onClick={() => handleCardClick(item)}
              >
                {/* Image */}
                <div className="relative overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-auto object-cover min-h-[200px] bg-muted/30"
                    loading="lazy"
                  />
                  {/* Hover overlay - always visible on mobile, hover on desktop */}
                  <div className="absolute inset-0 bg-black/20 sm:bg-black/30 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="h-10 w-10 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center">
                      <Eye className="h-5 w-5 text-foreground" />
                    </div>
                  </div>
                  {/* Lock icon */}
                  {!item.isUnlocked && item.type !== "free" && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md rounded-lg p-1.5">
                      <Lock className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className="font-medium text-sm line-clamp-1 flex-1"
                      title={item.title}
                    >
                      {item.title}
                    </h3>
                    {item.type === "free" ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                        {t.galFree}
                      </span>
                    ) : item.isUnlocked ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1 shrink-0">
                        <Unlock className="h-2.5 w-2.5" />
                        {t.galUnlocked}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                        {t.galPremiumPrompt}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[1100px] max-h-[90vh] sm:max-h-[85vh] p-0 overflow-hidden bg-white border-border shadow-2xl">
          {selectedItem && (
            <div className="flex flex-col md:flex-row h-[85vh] sm:h-[80vh] max-h-[750px]">
              {/* Image side */}
              <div className="w-full md:w-[55%] bg-muted/20 relative min-h-[250px] md:min-h-full flex items-center justify-center">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="w-full h-full object-contain absolute inset-0 p-3 md:p-4"
                />
              </div>

              {/* Info side */}
              <div className="w-full md:w-[45%] p-4 sm:p-6 md:p-8 flex flex-col h-full overflow-y-auto">
                <DialogHeader className="mb-4 text-left">
                  <DialogTitle className="text-xl font-bold">
                    {selectedItem.title}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="bg-muted px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground">
                      {selectedItem.category}
                    </span>
                    {selectedItem.type === "free" ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 border border-emerald-200">
                        <Unlock className="h-3 w-3" />
                        {t.galFree}
                      </span>
                    ) : selectedItem.isUnlocked ? (
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 border border-blue-200">
                        <Unlock className="h-3 w-3" />
                        {t.galUnlocked}
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 border border-amber-200">
                        <Lock className="h-3 w-3" />
                        {t.galPremiumPrompt}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex flex-col justify-center py-4">
                  {detailLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <Loader2 className="h-7 w-7 animate-spin text-brand mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {t.galLoading}
                      </p>
                    </div>
                  ) : !selectedItem.isUnlocked &&
                    selectedItem.type !== "free" ? (
                    /* Locked state */
                    <div className="flex flex-col items-center justify-center text-center p-6 bg-muted/30 rounded-2xl border border-border h-full">
                      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <Lock className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-semibold mb-2">
                        {t.galUnlockToView}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
                        {token ? t.galUnlockHint : t.galLoginUnlockHint}
                      </p>
                      <Button
                        onClick={() =>
                          handleUnlock(
                            selectedItem.id,
                            selectedItem.unlockQuota
                          )
                        }
                        className="w-full max-w-[220px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11"
                        disabled={unlocking}
                      >
                        {unlocking ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : !token ? (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        ) : (
                          <Unlock className="h-4 w-4 mr-2" />
                        )}
                        {!token
                          ? t.galLoginToUnlock
                          : t.galUnlockCost.replace(
                              "{quota}",
                              String(selectedItem.unlockQuota)
                            )}
                      </Button>
                    </div>
                  ) : (
                    /* Unlocked state */
                    <div className="space-y-5">
                      {/* English Prompt */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-brand" />
                            {t.galPromptEn}
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-brand hover:text-brand-dark hover:bg-brand-light"
                            onClick={() =>
                              handleCopy(selectedItem.promptEn || "")
                            }
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {t.galCopied.split(" ")[0]}
                          </Button>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-xl border border-border">
                          <p
                            className="text-sm leading-relaxed text-foreground break-words line-clamp-6"
                            title={selectedItem.promptEn || ""}
                          >
                            {selectedItem.promptEn || t.galNoPrompt}
                          </p>
                        </div>
                      </div>

                      {/* Chinese Prompt */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-purple" />
                            {t.galPromptZh}
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-purple hover:text-purple-dark hover:bg-purple-light"
                            onClick={() =>
                              handleCopy(selectedItem.promptZh || "")
                            }
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {t.galCopied.split(" ")[0]}
                          </Button>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-xl border border-border">
                          <p
                            className="text-sm leading-relaxed text-foreground break-words line-clamp-4"
                            title={selectedItem.promptZh || ""}
                          >
                            {selectedItem.promptZh || t.galNoPrompt}
                          </p>
                        </div>
                      </div>

                      {/* Try it button */}
                      <div className="pt-2 mt-auto">
                        <Button
                          onClick={() =>
                            handleTryIt(
                              language === "zh"
                                ? selectedItem.promptZh!
                                : selectedItem.promptEn!
                            )
                          }
                          className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium shadow-sm"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
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
