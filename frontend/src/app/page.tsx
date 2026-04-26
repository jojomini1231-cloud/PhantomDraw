"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Loader2, Sparkles, AlertCircle, Download,
  PenTool, Plus, Ban, Sliders, ChevronRight,
  Clock, XCircle, ImageIcon, Upload, Cpu, CheckCircle2
} from "lucide-react";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { Suspense } from "react";

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WorkspacePageContent />
    </Suspense>
  );
}

function WorkspacePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, updateQuota } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language];
  const [mounted, setMounted] = useState(false);
  
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [showNegative, setShowNegative] = useState(false);
  const [initImage, setInitImage] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState("gpt-image-2");
  const [history, setHistory] = useState<any[]>([]);

  const MODELS = [
    { id: "gpt-image-2", name: "GPT-Image-2", desc: "速度与质量的完美平衡" },
  ];
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse prompt from URL query params when arriving from gallery
  useEffect(() => {
    if (mounted) {
      const promptFromQuery = searchParams.get('prompt');
      if (promptFromQuery) {
        setPrompt(decodeURIComponent(promptFromQuery));
        // Remove query param from URL cleanly
        router.replace('/');
      }
    }
  }, [mounted, searchParams, router]);

  useEffect(() => {
    if (!mounted) return;

    if (!token) {
      router.replace("/login");
    } else {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3008";
      socketRef.current = io(wsUrl, {
        auth: { token },
      });

      socketRef.current.on("connect", () => {
        console.log("WebSocket connected");
      });

      socketRef.current.on("taskUpdate", (task) => {
        setCurrentTask(task);
        if (task.status === "success") {
          setIsGenerating(false);
          toast.success(t.msgGenerateSuccess);
          setHistory(prev => [task, ...prev].slice(0, 10)); // Keep last 10
        } else if (task.status === "failed") {
          setIsGenerating(false);
          toast.error(task.errorReason || t.msgGenerateFailed);
        }
      });

      return () => {
        socketRef.current?.disconnect();
      };
    }
  }, [mounted, token, router, t.msgGenerateSuccess, t.msgGenerateFailed]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(t.msgEnterPrompt);
      return;
    }

    setIsGenerating(true);
    try {
      const isImg2Img = !!initImage;
      const data = await fetchApi("/generate", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          negativePrompt,
          type: isImg2Img ? "img2img" : "txt2img",
          initImage: initImage || undefined,
          model: activeModel
        }),
      });
      setCurrentTask(data);
      updateQuota(data.remainingQuota);
      toast.info(t.msgTaskStarted);
    } catch (err: any) {
      toast.error(err.message || t.msgTaskFailed);
      setIsGenerating(false);
    }
  };

  if (!mounted || !token) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-[#F8FAFC]">
      {/* Left Sidebar */}
      <aside className="w-80 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-full z-10 shadow-[2px_0_8px_rgba(0,0,0,0.02)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Prompt Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
                <PenTool className="h-4 w-4 text-blue-500" />
                {t.wsPromptTitle}
              </h3>
              <Button variant="outline" size="sm" className="h-7 text-xs text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-full px-3">
                <Sparkles className="h-3 w-3 mr-1" />
                {t.wsAIOptimize}
              </Button>
            </div>
            
            <div className="relative">
              <Textarea
                placeholder={t.wsPromptPlaceholder}
                className="min-h-[120px] resize-none bg-slate-50 border-slate-200 focus-visible:ring-blue-500 text-sm p-3 pb-10"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <Button size="icon" variant="ghost" className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-white shadow-sm border border-slate-200 text-slate-500 hover:text-blue-500">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {!showNegative ? (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-slate-500 hover:text-slate-800 h-7 px-2"
                onClick={() => setShowNegative(true)}
              >
                {t.wsNegativePromptBtn}
              </Button>
            ) : (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    {t.wsNegativePromptTitle}
                  </span>
                  <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setShowNegative(false)}>
                    <XCircle className="h-3 w-3 text-slate-400" />
                  </Button>
                </div>
                <Textarea
                  placeholder={t.wsNegativePromptPlaceholder}
                  className="min-h-[60px] resize-none bg-slate-50 border-slate-200 focus-visible:ring-blue-500 text-sm p-3"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Image Upload (Img2Img) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
                <ImageIcon className="h-4 w-4 text-blue-500" />
                {(t as any).wsUploadImageTitle || '参考图 (图生图)'}
              </h3>
              {initImage && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2 rounded"
                  onClick={() => setInitImage(null)}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  移除
                </Button>
              )}
            </div>
            
            <div className="relative">
              {!initImage ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-6 h-6 mb-2 text-slate-400" />
                    <p className="text-xs text-slate-500">点击上传参考图片</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("图片大小不能超过 5MB");
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setInitImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </label>
              ) : (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={initImage} alt="Reference" className="w-full h-full object-cover" />
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-white bg-black/40 px-3 py-1.5 rounded-full text-xs font-medium">
                      <Upload className="w-3.5 h-3.5" /> 更换图片
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error("图片大小不能超过 5MB");
                            e.target.value = '';
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setInitImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
              <Cpu className="h-4 w-4 text-blue-500" />
              模型引擎
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setActiveModel(model.id)}
                  className={`flex flex-col text-left px-4 py-3 rounded-xl border transition-colors ${
                    activeModel === model.id 
                      ? 'bg-blue-50 border-blue-500 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${activeModel === model.id ? 'text-blue-700' : 'text-slate-700'}`}>
                      {model.name}
                    </span>
                    {activeModel === model.id && (
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <span className={`text-xs ${activeModel === model.id ? 'text-blue-600/80' : 'text-slate-500'}`}>
                    {model.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="pt-2">
            <button className="flex items-center justify-between w-full py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                {t.wsAdvancedSettings}
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Generate Button Sticky Bottom */}
        <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim()} 
            className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md transition-all flex items-center justify-between px-6"
          >
            <span className="font-medium text-base">{t.wsGenerateBtn}</span>
            {isGenerating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded text-sm">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                1
              </div>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative bg-slate-50/50">
        <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
          {/* Status Indicator */}
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
            <span className="text-xs font-medium text-slate-600">
              {isGenerating ? t.wsGenerating : t.wsCurrentTask}
            </span>
          </div>

          {/* Canvas Area */}
          <div className="w-full max-w-3xl flex-1 flex items-center justify-center min-h-[500px]">
            {!currentTask ? (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <div className="h-24 w-24 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 border border-slate-200 border-dashed">
                  <Sparkles className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-sm font-medium">{t.wsStartTyping}</p>
              </div>
            ) : (
              <div className="relative w-full max-w-2xl aspect-square bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                {(currentTask.status === "pending" || currentTask.status === "running") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                    <p className="text-sm font-medium text-slate-700">{t.wsDrawing}</p>
                    <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                )}
                
                {currentTask.status === "failed" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 text-red-500">
                    <AlertCircle className="h-10 w-10 mb-4" />
                    <p className="font-medium">{t.wsGenerateFailed}</p>
                    <p className="text-xs text-red-400 mt-2">{currentTask.errorReason}</p>
                  </div>
                )}

                {currentTask.imageUrl && (
                  <div className="relative w-full h-full rounded-xl overflow-hidden group">
                    <Image 
                      src={currentTask.imageUrl} 
                      alt={currentTask.prompt}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={currentTask.imageUrl} target="_blank" download className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg hover:bg-white transition-colors border border-transparent">
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="h-10 border-t border-slate-200 bg-white flex items-center justify-between px-6 text-xs text-slate-500 shrink-0">
          <span className="font-mono tracking-wider">SYSTEM PROTOCOL V1.4.2</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span className="font-medium">{t.wsReady}</span>
          </div>
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="w-72 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col h-full z-10 shadow-[-2px_0_8px_rgba(0,0,0,0.02)] hidden lg:flex">
        {/* History Section */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-800 mb-4 sticky top-0 bg-white py-1">
            <Clock className="h-4 w-4 text-blue-500" />
            {t.wsHistoryTitle}
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            {history.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                {t.wsNoHistory}
              </div>
            ) : (
              history.map((item, i) => (
                <div key={i} className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative group cursor-pointer border border-slate-200 hover:border-blue-400 transition-colors">
                  {item.imageUrl && (
                    <Image 
                      src={item.imageUrl} 
                      alt="History item" 
                      fill 
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
              ))
            )}
            
            {/* Dummy history items for visual structure if empty to match screenshot */}
            {history.length === 0 && (
              <>
                <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200 opacity-50"></div>
                <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200 opacity-50"></div>
              </>
            )}
          </div>
        </div>

        {/* Parameters Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 min-h-[160px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
              {t.wsParamsTitle}
            </h3>
            {currentTask && <span className="text-[10px] font-mono text-blue-500 bg-blue-50 px-2 py-0.5 rounded">ID: {currentTask.id?.substring(0,6) || '5J7Q0'}</span>}
          </div>
          
          {currentTask ? (
            <div className="space-y-2 text-xs text-slate-600">
              <p className="line-clamp-3 leading-relaxed">{currentTask.prompt}</p>
              <div className="grid grid-cols-2 gap-y-1 mt-3 pt-3 border-t border-slate-200">
                <div className="text-slate-400">任务类型</div>
                <div className="text-right font-medium">{currentTask.type === 'img2img' ? '图生图' : '文生图'}</div>
                <div className="text-slate-400 mt-1">模型引擎</div>
                <div className="text-right font-medium mt-1 uppercase">{currentTask.model || activeModel}</div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">
              {t.wsStartToSeeParams}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
