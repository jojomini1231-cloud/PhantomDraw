"use client";

import { useEffect, useState } from "react";
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
  LogIn,
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

export default function HistoryPage() {
  const { token } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language];
  const router = useRouter();

  const [tasks, setTasks] = useState<HistoryTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/login");
    }
  }, [mounted, token, router]);

  const loadHistory = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchApi("/generate/history");
      setTasks(data);
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [token]);

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
              <Button variant="outline" onClick={loadHistory}>
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
          /* Task Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
            {tasks.map((task) => {
              const statusConfig = getStatusConfig(task.status);
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group"
                >
                  {/* Image area */}
                  <div className="aspect-square relative bg-muted/30 flex items-center justify-center">
                    {task.status === "success" && task.imageUrl ? (
                      <>
                        <Image
                          src={task.imageUrl}
                          alt={task.prompt}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <a
                            href={task.imageUrl}
                            target="_blank"
                            download
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-foreground shadow-lg hover:scale-105 transition-transform duration-200"
                          >
                            <Download className="h-5 w-5" />
                          </a>
                        </div>
                      </>
                    ) : task.status === "failed" ? (
                      <div className="flex flex-col items-center p-4 text-center">
                        <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
                          <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <span className="text-xs text-muted-foreground max-w-[180px]">
                          {task.errorReason || t.histFailed}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center mb-2">
                          <Loader2 className="h-6 w-6 animate-spin text-brand" />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t.histPending}
                        </span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div
                      className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-md ${statusConfig.bg} ${statusConfig.text_color} ${statusConfig.border} border`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}
                      />
                      {statusConfig.text}
                    </div>
                  </div>

                  {/* Info area */}
                  <div className="p-4">
                    <p
                      className="text-sm font-medium text-foreground line-clamp-2 mb-3 leading-snug"
                      title={task.prompt}
                    >
                      {task.prompt}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {task.style && (
                        <span className="px-2 py-0.5 rounded-md bg-muted/50 text-[10px] font-medium text-muted-foreground border border-border/50">
                          {task.style}
                        </span>
                      )}
                      {task.aspectRatio && (
                        <span className="px-2 py-0.5 rounded-md bg-muted/50 text-[10px] font-medium text-muted-foreground border border-border/50">
                          {task.aspectRatio}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
