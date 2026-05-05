"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  AlertCircle,
  Download,
  PenTool,
  Plus,
  Ban,
  Sliders,
  ChevronRight,
  Clock,
  X,
  ImageIcon,
  Upload,
  Cpu,
  CheckCircle2,
  Wand2,
  Palette,
  ArrowRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { Suspense } from "react";

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-canvas">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
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
  const [showMobileComposer, setShowMobileComposer] = useState(false);

  const MODELS = [
    {
      id: "gpt-image-2",
      name: "GPT-Image-2",
      desc: language === "zh" ? "速度与质量的完美平衡" : "Perfect balance of speed and quality",
    },
  ];

  const QUICK_PROMPTS =
    language === "zh"
      ? [
          "赛博朋克城市夜景，霓虹灯光倒映在雨水中",
          "水彩风格的森林小鹿，柔和的晨光",
          "太空中的水晶宫殿，折射出彩虹光芒",
          "古风仙侠人物，飘逸衣袂，云雾缭绕",
        ]
      : [
          "Cyberpunk cityscape at night, neon lights reflecting in rain",
          "Watercolor forest with a gentle deer, soft morning light",
          "Crystal palace in outer space, refracting rainbow light",
          "Ancient Chinese immortal warrior, flowing robes, misty clouds",
        ];

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const promptFromQuery = searchParams.get("prompt");
      if (promptFromQuery) {
        setPrompt(decodeURIComponent(promptFromQuery));
        router.replace("/");
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
          setHistory((prev) => [task, ...prev].slice(0, 10));
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
          model: activeModel,
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
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-canvas">
      {/* Left Sidebar - Prompt Composer */}
      <aside className="w-80 xl:w-[340px] flex-shrink-0 border-r border-border bg-white flex flex-col h-full z-10 hidden md:flex">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Prompt Section */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <PenTool className="h-4 w-4 text-brand" />
                {t.wsPromptTitle}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-brand hover:text-brand-dark hover:bg-brand-light rounded-md px-2"
              >
                <Wand2 className="h-3 w-3 mr-1" />
                {t.wsAIOptimize}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder={t.wsPromptPlaceholder}
                className="min-h-[140px] resize-none bg-muted/30 border-border focus-visible:ring-2 focus-visible:ring-primary/20 text-sm p-3.5 leading-relaxed"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {/* Quick prompt chips */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t.wsQuickPrompts}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(qp)}
                    className="px-2.5 py-1 text-xs rounded-md bg-muted/50 text-muted-foreground hover:bg-brand-light hover:text-brand border border-border/50 hover:border-brand/30 transition-all duration-200 truncate max-w-[180px]"
                    title={qp}
                  >
                    {qp.length > 20 ? `${qp.slice(0, 20)}...` : qp}
                  </button>
                ))}
              </div>
            </div>

            {/* Negative prompt toggle */}
            {!showNegative ? (
              <button
                onClick={() => setShowNegative(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3 w-3" />
                {t.wsNegativePromptBtn}
              </button>
            ) : (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Ban className="h-3 w-3" />
                    {t.wsNegativePromptTitle}
                  </span>
                  <button
                    onClick={() => setShowNegative(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Textarea
                  placeholder={t.wsNegativePromptPlaceholder}
                  className="min-h-[60px] resize-none bg-muted/30 border-border focus-visible:ring-2 focus-visible:ring-primary/20 text-sm p-3"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-border/50" />

          {/* Image Upload */}
          <div className="p-5 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-purple" />
              {t.wsUploadImageTitle}
            </h3>

            {!initImage ? (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/40 hover:border-purple/30 transition-all duration-200 group">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Upload className="w-5 h-5 text-muted-foreground group-hover:text-purple transition-colors" />
                  <p className="text-xs text-muted-foreground">
                    {t.wsUploadImageDesc}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {t.wsUploadImageHint}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error(
                          language === "zh"
                            ? "图片大小不能超过 5MB"
                            : "Image size cannot exceed 5MB"
                        );
                        e.target.value = "";
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
              <div className="relative w-full h-28 rounded-xl overflow-hidden border border-border group">
                <img
                  src={initImage}
                  alt="Reference"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="flex items-center gap-1.5 text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-white/30 transition-colors">
                    <Upload className="w-3 h-3" />
                    {t.wsChangeImage}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error(
                              language === "zh"
                                ? "图片大小不能超过 5MB"
                                : "Image size cannot exceed 5MB"
                            );
                            e.target.value = "";
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
                  <button
                    onClick={() => setInitImage(null)}
                    className="flex items-center gap-1.5 text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/30 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    {t.wsRemoveImage}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-border/50" />

          {/* Model Selection */}
          <div className="p-5 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple" />
              {t.wsModelTitle}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setActiveModel(model.id)}
                  className={`flex items-center justify-between text-left px-3.5 py-3 rounded-xl border transition-all duration-200 ${
                    activeModel === model.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-white border-border hover:border-foreground/20 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex flex-col">
                    <span
                      className={`text-sm font-medium ${
                        activeModel === model.id
                          ? "text-primary-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {model.name}
                    </span>
                    <span
                      className={`text-xs ${
                        activeModel === model.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {model.desc}
                    </span>
                  </div>
                  {activeModel === model.id && (
                    <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="px-5 pb-5">
            <button className="flex items-center justify-between w-full py-2.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                {t.wsAdvancedSettings}
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Generate Button */}
        <div className="p-4 bg-white border-t border-border">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-all duration-200 shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t.wsGenerating}
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                {t.wsGenerateBtn}
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile Composer Toggle */}
      <div className="md:hidden fixed bottom-20 left-4 right-4 z-40">
        <Button
          onClick={() => setShowMobileComposer(!showMobileComposer)}
          className="w-full h-12 bg-primary text-primary-foreground rounded-xl shadow-lg"
        >
          <PenTool className="h-4 w-4 mr-2" />
          {t.wsPromptTitle}
        </Button>
      </div>

      {/* Mobile Composer Drawer */}
      {showMobileComposer && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">{t.wsPromptTitle}</h3>
              <button
                onClick={() => setShowMobileComposer(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <Textarea
                placeholder={t.wsPromptPlaceholder}
                className="min-h-[120px] resize-none bg-muted/30 border-border text-sm"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(qp)}
                    className="px-2.5 py-1 text-xs rounded-md bg-muted/50 text-muted-foreground hover:bg-brand-light hover:text-brand border border-border/50 transition-all"
                  >
                    {qp.length > 15 ? `${qp.slice(0, 15)}...` : qp}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => {
                  handleGenerate();
                  setShowMobileComposer(false);
                }}
                disabled={isGenerating || !prompt.trim()}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {t.wsGenerateBtn}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Canvas */}
      <main className="flex-1 flex flex-col h-full relative bg-canvas">
        <div className="flex-1 p-4 lg:p-6 flex flex-col items-center justify-center overflow-y-auto">
          {/* Status Indicator */}
          <div className="absolute top-4 left-4 lg:top-6 lg:left-6 flex items-center gap-2 z-10">
            <div
              className={`w-2 h-2 rounded-full ${
                isGenerating
                  ? "bg-amber-400 animate-pulse"
                  : "bg-emerald-400"
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {isGenerating ? t.wsGenerating : t.wsCurrentTask}
            </span>
          </div>

          {/* Canvas Area */}
          <div className="w-full max-w-3xl flex-1 flex items-center justify-center min-h-[400px]">
            {!currentTask ? (
              /* Empty State - Creative Starter Zone */
              <div className="flex flex-col items-center text-center max-w-md mx-auto px-4">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-brand/10 to-purple/10 flex items-center justify-center mb-6 border border-brand/10">
                  <Sparkles className="h-8 w-8 text-brand" />
                </div>
                <h2 className="text-xl font-bold mb-2">{t.wsEmptyTitle}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                  {t.wsEmptyDesc}
                </p>

                {/* Quick start suggestions */}
                <div className="w-full space-y-3">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {t.wsEmptyHint1}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_PROMPTS.slice(0, 4).map((qp, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(qp)}
                        className="p-3 text-left rounded-xl bg-white border border-border hover:border-brand/30 hover:shadow-sm transition-all duration-200 group"
                      >
                        <p className="text-xs text-foreground line-clamp-2 leading-relaxed group-hover:text-brand transition-colors">
                          {qp}
                        </p>
                        <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-brand mt-2 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Task Result */
              <div className="relative w-full max-w-2xl aspect-square bg-white rounded-2xl shadow-sm border border-border overflow-hidden flex items-center justify-center p-2">
                {(currentTask.status === "pending" ||
                  currentTask.status === "running") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand/20 to-purple/20 flex items-center justify-center mb-4">
                        <Loader2 className="h-8 w-8 animate-spin text-brand" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {t.wsDrawing}
                    </p>
                    <div className="w-48 h-1 bg-muted rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand to-purple rounded-full w-1/2 animate-pulse" />
                    </div>
                  </div>
                )}

                {currentTask.status === "failed" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                    <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <p className="font-medium text-foreground">
                      {t.wsGenerateFailed}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 max-w-xs text-center">
                      {currentTask.errorReason}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setCurrentTask(null);
                        handleGenerate();
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                      {t.errorRetry}
                    </Button>
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
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <a
                        href={currentTask.imageUrl}
                        target="_blank"
                        download
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm text-foreground shadow-md hover:bg-white transition-colors border border-border"
                      >
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
        <div className="h-9 border-t border-border bg-white flex items-center justify-between px-4 lg:px-6 text-[11px] text-muted-foreground shrink-0">
          <span className="font-mono tracking-wider opacity-60">
            PHANTOMDRAW v1.0
          </span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium">{t.wsReady}</span>
          </div>
        </div>
      </main>

      {/* Right Sidebar - History & Parameters */}
      <aside className="w-64 xl:w-72 flex-shrink-0 border-l border-border bg-white flex flex-col h-full z-10 hidden lg:flex">
        {/* History Section */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 flex flex-col">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4 sticky top-0 bg-white py-1 z-10">
            <Clock className="h-4 w-4 text-brand" />
            {t.wsHistoryTitle}
          </h3>

          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                <Clock className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                {t.wsNoHistory}
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {t.wsHistoryHint}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {history.map((item, i) => (
                <div
                  key={i}
                  className="aspect-square bg-muted/30 rounded-lg overflow-hidden relative group cursor-pointer border border-border hover:border-brand/30 transition-all duration-200"
                >
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
              ))}
            </div>
          )}
        </div>

        {/* Parameters Section */}
        <div className="p-4 border-t border-border bg-muted/20 min-h-[140px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
              {t.wsParamsTitle}
            </h3>
            {currentTask && (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                ID: {currentTask.id?.substring(0, 6) || "---"}
              </span>
            )}
          </div>

          {currentTask ? (
            <div className="space-y-2.5 text-xs">
              <p className="line-clamp-3 leading-relaxed text-foreground">
                {currentTask.prompt}
              </p>
              <div className="space-y-2 pt-2.5 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.wsParamType}</span>
                  <span className="font-medium">
                    {currentTask.type === "img2img"
                      ? t.wsParamTypeImg2Img
                      : t.wsParamTypeTxt2Img}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.wsParamModel}</span>
                  <span className="font-medium uppercase text-[11px]">
                    {currentTask.model || activeModel}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <p className="text-xs text-muted-foreground">
                {t.wsStartToSeeParams}
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
