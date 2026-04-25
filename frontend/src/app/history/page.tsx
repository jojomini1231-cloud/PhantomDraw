"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { fetchApi } from "@/lib/api";
import { Loader2, AlertCircle, Clock, Download, Image as ImageIcon } from "lucide-react";
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

  useEffect(() => {
    if (!token) return;

    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const data = await fetchApi("/generate/history");
        setTasks(data);
      } catch (err: any) {
        setError(err.message || "Failed to load history");
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return t.histSuccess;
      case 'failed': return t.histFailed;
      default: return t.histPending;
    }
  };

  if (!token) return null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Clock className="h-8 w-8 text-blue-500" />
          {t.histTitle}
        </h1>
        <p className="text-slate-500 mt-2">{t.histSubtitle}</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-500" />
          <p>{t.histLoading}</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500 bg-red-50 rounded-2xl border border-red-100">
          <AlertCircle className="h-10 w-10 mb-4" />
          <p>{error}</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <ImageIcon className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-medium text-slate-700 mb-2">{t.histEmpty}</h3>
          <Link href="/" className="mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-2.5 text-sm font-medium transition-colors shadow-sm">
            {t.histGoCreate}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
              <div className="aspect-square relative bg-slate-100 border-b border-slate-100 flex items-center justify-center">
                {task.status === 'success' && task.imageUrl ? (
                  <>
                    <Image 
                      src={task.imageUrl} 
                      alt={task.prompt} 
                      fill 
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a href={task.imageUrl} target="_blank" download className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg hover:scale-110 transition-transform">
                        <Download className="h-5 w-5" />
                      </a>
                    </div>
                  </>
                ) : task.status === 'failed' ? (
                  <div className="text-red-400 flex flex-col items-center p-4 text-center">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <span className="text-xs">{task.errorReason || t.histFailed}</span>
                  </div>
                ) : (
                  <div className="text-blue-500 flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <span className="text-xs">{t.histPending}</span>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-md shadow-sm ${
                  task.status === 'success' ? 'bg-emerald-500/90 text-white' : 
                  task.status === 'failed' ? 'bg-red-500/90 text-white' : 
                  'bg-blue-500/90 text-white'
                }`}>
                  {getStatusText(task.status)}
                </div>
              </div>
              
              <div className="p-4">
                <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-3 leading-snug" title={task.prompt}>
                  {task.prompt}
                </p>
                
                <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] uppercase mb-0.5">{t.histStyle}</span>
                    <span className="font-medium text-slate-700">{task.style || 'DEFAULT'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] uppercase mb-0.5">{t.histRatio}</span>
                    <span className="font-medium text-slate-700">{task.aspectRatio || '1:1'}</span>
                  </div>
                  <div className="col-span-2 flex flex-col pt-1 border-t border-slate-200 mt-1">
                    <span className="text-slate-400 text-[10px] uppercase mb-0.5">{t.histTime}</span>
                    <span className="text-slate-600">{formatDate(task.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}