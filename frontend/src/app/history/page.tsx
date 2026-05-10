"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { fetchApi } from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  Clock,
  Download,
  Image as ImageIcon,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface HistoryTask {
  id: string;
  prompt: string;
  negativePrompt: string;
  type: string;
  style: string;
  aspectRatio: string;
  status: string;
  imageUrl: string | null;
  errorReason: string | null;
  createdAt: string;
}

interface HistoryResponse {
  items: HistoryTask[];
  total?: number;
  hasMore?: boolean;
  nextOffset?: number;
}

const PAGE_SIZE = 12;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function compactText(text: string | null | undefined, maxLength = 118) {
  if (!text) return "";
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

export default function HistoryPage() {
  const { token } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language];
  const router = useRouter();

  const [tasks, setTasks] = useState<HistoryTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/login");
    }
  }, [mounted, token, router]);

  const loadHistory = useCallback(async (reset = false, offset = 0) => {
    if (!token || (!reset && loadingMoreRef.current)) return;

    const requestOffset = reset ? 0 : offset;
    try {
      if (reset) {
        setIsLoading(true);
      } else {
        loadingMoreRef.current = true;
        setIsLoadingMore(true);
      }
      setError(null);
      const data = (await fetchApi(
        `/generate/history?limit=${PAGE_SIZE}&offset=${requestOffset}`
      )) as HistoryResponse | HistoryTask[];

      const items = Array.isArray(data)
        ? data.slice(requestOffset, requestOffset + PAGE_SIZE)
        : data.items;
      const incomingNextOffset = Array.isArray(data)
        ? requestOffset + items.length
        : data.nextOffset ?? requestOffset + items.length;
      const incomingHasMore = Array.isArray(data)
        ? requestOffset + items.length < data.length
        : Boolean(data.hasMore);

      setTasks((current) => {
        if (reset) return items;

        const existingIds = new Set(current.map((task) => task.id));
        const uniqueItems = items.filter((task) => !existingIds.has(task.id));
        return [...current, ...uniqueItems];
      });
      setNextOffset(incomingNextOffset);
      setHasMore(incomingHasMore);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load history"));
    } finally {
      if (reset) {
        setIsLoading(false);
      } else {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [token]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadHistory(true, 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadHistory]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void loadHistory(false, nextOffset);
        }
      },
      { rootMargin: "520px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, loadHistory, nextOffset]);

  const handleRegenerate = (task: HistoryTask) => {
    window.sessionStorage.setItem(
      "phantom-draw-regenerate",
      JSON.stringify({
        prompt: task.prompt,
        negativePrompt: task.negativePrompt,
        imageUrl: task.imageUrl,
        taskId: task.id,
      })
    );
    router.push(`/?regen=${encodeURIComponent(task.id)}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(
      language === "zh" ? "zh-CN" : "en-US",
      {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(date);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "success":
        return {
          text: t.histSuccess,
          bg: "bg-emerald-50",
          text_color: "text-emerald-700",
          border: "border-emerald-200",
          dot: "bg-emerald-500",
        };
      case "failed":
        return {
          text: t.histFailed,
          bg: "bg-red-50",
          text_color: "text-red-700",
          border: "border-red-200",
          dot: "bg-red-500",
        };
      default:
        return {
          text: t.histPending,
          bg: "bg-amber-50",
          text_color: "text-amber-700",
          border: "border-amber-200",
          dot: "bg-amber-500",
        };
    }
  };

  if (!mounted || !token) return null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-canvas">
      <div className="container mx-auto py-8 px-4 lg:px-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t.histTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t.histSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Loader2 className="h-7 w-7 animate-spin text-brand" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {t.histLoading}
            </p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-32">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{t.histErrorTitle}</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
              {error.includes("401") || error.includes("Unauthorized")
                ? t.histUnauthorizedDesc
                : t.histErrorDesc}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => loadHistory(true, 0)}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {t.errorRetry}
              </Button>
              <Button render={<Link href="/" />}>
                <ArrowRight className="h-4 w-4 mr-1.5" />
                {t.histBackToWork}
              </Button>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-32">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-brand/10 to-purple/10 flex items-center justify-center mb-6 border border-brand/10">
              <ImageIcon className="h-8 w-8 text-brand" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{t.histEmpty}</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
              {t.histEmptyDesc}
            </p>
            <Button render={<Link href="/" />}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              {t.histGoCreate}
            </Button>
          </div>
        ) : (
          <>
            {/* Task Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
              {tasks.map((task) => {
                const statusConfig = getStatusConfig(task.status);
                const errorSummary = compactText(
                  task.errorReason || t.histFailed
                );

                return (
                  <div
                    key={task.id}
                    className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all duration-200 active:shadow-md sm:hover:shadow-md"
                  >
                    {/* Image area */}
                    <div className="relative flex aspect-square items-center justify-center bg-muted/30">
                      {task.status === "success" && task.imageUrl ? (
                        <>
                          <Image
                            src={task.imageUrl}
                            alt={task.prompt}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30 sm:bg-black/40 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleRegenerate(task)}
                              className="flex h-10 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-medium text-foreground shadow-lg transition-transform duration-200 active:scale-105 sm:hover:scale-105"
                            >
                              <RefreshCw className="h-4 w-4" />
                              {t.histRegenerate}
                            </button>
                            <a
                              href={task.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              aria-label={t.histDownload}
                              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-foreground shadow-lg transition-transform duration-200 active:scale-105 sm:hover:scale-105"
                            >
                              <Download className="h-5 w-5" />
                            </a>
                          </div>
                        </>
                      ) : task.status === "failed" ? (
                        <div className="flex flex-col items-center p-4 text-center">
                          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                            <AlertCircle className="h-6 w-6 text-destructive" />
                          </div>
                          <span
                            className="line-clamp-4 max-w-[180px] break-words text-xs leading-relaxed text-muted-foreground"
                            title={task.errorReason || t.histFailed}
                          >
                            {errorSummary}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10">
                            <Loader2 className="h-6 w-6 animate-spin text-brand" />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {t.histPending}
                          </span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div
                        className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur-md ${statusConfig.bg} ${statusConfig.text_color} ${statusConfig.border}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}
                        />
                        {statusConfig.text}
                      </div>
                    </div>

                    {/* Info area */}
                    <div className="p-4">
                      <p
                        className="mb-3 line-clamp-2 text-sm font-medium leading-snug text-foreground"
                        title={task.prompt}
                      >
                        {task.prompt}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        {task.style && (
                          <span className="rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {task.style}
                          </span>
                        )}
                        {task.aspectRatio && (
                          <span className="rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {task.aspectRatio}
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {formatDate(task.createdAt)}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerate(task)}
                        className="mt-3 h-9 w-full rounded-lg text-xs"
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        {t.histRegenerate}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              ref={loadMoreRef}
              className="flex min-h-20 items-center justify-center py-8"
            >
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  {t.histLoadingMore}
                </div>
              ) : hasMore ? (
                <span className="text-xs text-muted-foreground">
                  {t.histLoadingMore}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/70">
                  {t.histAllLoaded}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
