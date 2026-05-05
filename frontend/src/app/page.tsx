"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Coins,
  CircleHelp,
  ArrowRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { Suspense } from "react";

interface GenerationTask {
  id?: string;
  prompt?: string;
  negativePrompt?: string;
  type?: string;
  model?: string;
  size?: string;
  status?: "pending" | "running" | "success" | "failed" | string;
  imageUrl?: string;
  errorReason?: string;
  remainingQuota?: number;
}

interface RegeneratePayload {
  prompt?: string;
  negativePrompt?: string;
  imageUrl?: string | null;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

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
  const { token, quota, updateQuota } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language];
  const [mounted, setMounted] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTask, setCurrentTask] = useState<GenerationTask | null>(null);
  const [showNegative, setShowNegative] = useState(false);
  const [initImage, setInitImage] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState("gpt-image-2");
  const [size, setSize] = useState("1024x1024");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generationMode, setGenerationMode] = useState<"normal" | "agent">("normal");
  const [history, setHistory] = useState<GenerationTask[]>([]);
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

  const SIZES = [
    "1024x1024",
    "1536x1024",
    "1024x1536",
    "2048x2048",
    "2848x1152",
    "3840x2160",
    "2160x3840",
  ];

  const socketRef = useRef<Socket | null>(null);
  const promptCharCount = prompt.length;
  const promptReady = prompt.trim().length > 0;
  const currentModeLabel = initImage
    ? language === "zh"
      ? "图生图"
      : "Image to image"
    : language === "zh"
      ? "文生图"
      : "Text to image";
  const generationQuotaCost = generationMode === "agent" ? 0 : 1;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (mounted) {
      const regenerateId = searchParams.get("regen");
      const promptFromQuery = searchParams.get("prompt");
      const imageFromQuery = searchParams.get("image");
      const rawPayload =
        regenerateId && typeof window !== "undefined"
          ? window.sessionStorage.getItem("phantom-draw-regenerate")
          : null;

      if (rawPayload || promptFromQuery || imageFromQuery) {
        let payload: RegeneratePayload | null = null;
        if (rawPayload) {
          try {
            payload = JSON.parse(rawPayload) as RegeneratePayload;
          } catch {
            payload = null;
          }
        }

        const decodedPrompt = payload?.prompt || (promptFromQuery ? decodeURIComponent(promptFromQuery) : "");
        const decodedImage =
          payload?.imageUrl ||
          (imageFromQuery ? decodeURIComponent(imageFromQuery) : null);
        const decodedNegativePrompt = payload?.negativePrompt || "";
        const frame = window.requestAnimationFrame(() => {
          if (decodedPrompt) {
            setPrompt(decodedPrompt);
          }
          setNegativePrompt(decodedNegativePrompt);
          setInitImage(decodedImage || null);
          window.sessionStorage.removeItem("phantom-draw-regenerate");
          router.replace("/");
        });
        return () => window.cancelAnimationFrame(frame);
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

      socketRef.current.on("taskUpdate", (task: GenerationTask) => {
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
      const data = (await fetchApi("/generate", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          negativePrompt,
          type: isImg2Img ? "img2img" : "txt2img",
          initImage: initImage || undefined,
          model: activeModel,
          size,
        }),
      })) as GenerationTask;
      setCurrentTask(data);
      if (typeof data.remainingQuota === "number") {
        updateQuota(data.remainingQuota);
      }
      toast.info(t.msgTaskStarted);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, t.msgTaskFailed));
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
    <div className="studio-workspace flex h-[calc(100vh-3.5rem)] overflow-hidden bg-canvas text-foreground">
      {/* Left Sidebar - Prompt Composer */}
      <aside className="hidden h-full w-[344px] flex-shrink-0 flex-col border-r border-border/80 bg-white/95 shadow-[1px_0_0_rgba(24,24,27,0.02)] backdrop-blur md:flex xl:w-[368px]">
        <div className="border-b border-border/70 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                {language === "zh" ? "创作控制台" : "Creation console"}
              </p>
              <h2 className="mt-1 text-base font-semibold">
                {t.wsPromptTitle}
              </h2>
            </div>
            <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground">
              <Coins className="h-3.5 w-3.5 text-brand" />
              <span>{quota}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="relative rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                  {t.wsModeTitle}
                </p>
                <div className="group/mode-help relative">
                  <button
                    type="button"
                    className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white hover:text-foreground focus-visible:bg-white"
                    aria-label={t.wsModeHelpLabel}
                  >
                    <CircleHelp className="h-3.5 w-3.5" />
                  </button>
                  <div className="pointer-events-none absolute left-1/2 top-6 z-30 w-64 -translate-x-1/2 rounded-lg border border-border bg-white p-3 text-left text-xs leading-relaxed text-muted-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/mode-help:opacity-100 group-focus-within/mode-help:opacity-100">
                    <p>
                      <span className="font-semibold text-foreground">
                        {t.wsModeNormal}
                      </span>
                      ：{t.wsModeNormalDesc}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">
                        {t.wsModeAgent}
                      </span>
                      ：{t.wsModeAgentDesc}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-white p-1 ring-1 ring-border/70">
                <button
                  type="button"
                  onClick={() => setGenerationMode("normal")}
                  className={`h-7 rounded text-[11px] font-semibold transition-colors ${
                    generationMode === "normal"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.wsModeNormal}
                </button>
                <button
                  type="button"
                  disabled
                  title={t.wsModeAgentDesc}
                  className="h-7 cursor-not-allowed rounded text-[11px] font-semibold text-muted-foreground opacity-55"
                >
                  {t.wsModeAgent}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">
                {language === "zh" ? "模型" : "Model"}
              </p>
              <p className="mt-1 truncate text-xs font-semibold">
                {activeModel}
              </p>
            </div>
          </div>
        </div>

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
                className="h-8 rounded-lg px-2 text-xs text-brand hover:bg-brand-light hover:text-brand-dark"
              >
                <Wand2 className="h-3 w-3 mr-1" />
                {t.wsAIOptimize}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder={t.wsPromptPlaceholder}
                rows={20}
                className="field-sizing-fixed resize-none overflow-y-auto rounded-lg border-border bg-muted/25 p-3.5 text-sm leading-relaxed shadow-inner shadow-zinc-950/[0.02] scrollbar-thin focus-visible:ring-2 focus-visible:ring-brand/25"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm ring-1 ring-border/70">
                {promptCharCount} {language === "zh" ? "字" : "chars"}
              </div>
            </div>

            {/* Quick prompt chips */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                {t.wsQuickPrompts}
              </p>
              <div className="grid gap-2">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(qp)}
                    className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2 text-left text-xs text-muted-foreground shadow-sm shadow-zinc-950/[0.02] transition-all duration-200 hover:border-brand/40 hover:bg-brand-light/60 hover:text-foreground"
                    title={qp}
                  >
                    <span className="line-clamp-2 leading-relaxed">{qp}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
                  </button>
                ))}
              </div>
            </div>

            {/* Negative prompt toggle */}
            {!showNegative ? (
              <button
                onClick={() => setShowNegative(true)}
                className="flex h-9 items-center gap-1.5 rounded-lg px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={language === "zh" ? "关闭负面提示词" : "Close negative prompt"}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Textarea
                  placeholder={t.wsNegativePromptPlaceholder}
                  className="min-h-[72px] resize-none rounded-lg border-border bg-muted/25 p-3 text-sm focus-visible:ring-2 focus-visible:ring-brand/25"
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
              <label className="group flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 transition-all duration-200 hover:border-purple/40 hover:bg-muted/40">
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
              <div className="group relative h-28 w-full overflow-hidden rounded-lg border border-border bg-muted/30">
                <Image
                  src={initImage}
                  alt="Reference"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                  <label className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30">
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
                    className="flex min-h-9 items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
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
                  className={`flex min-h-[68px] items-center justify-between rounded-lg border px-3.5 py-3 text-left transition-all duration-200 ${
                    activeModel === model.id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-white hover:border-foreground/20 hover:bg-muted/30"
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
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                {t.wsAdvancedSettings}
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`} />
            </button>
            
            {showAdvanced && (
              <div className="mt-3 space-y-4 px-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase text-muted-foreground">
                    {t.wsSizeTitle || "尺寸"}
                  </label>
                  <Select value={size} onValueChange={(val) => setSize(val as string)}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="border-t border-border bg-white p-4">
          <div className="mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-medium">{currentModeLabel}</span>
            <div className="flex items-center gap-2">
              <span>
                {promptReady
                  ? `${promptCharCount} ${language === "zh" ? "字" : "chars"}`
                  : t.msgEnterPrompt}
              </span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">
                {t.wsQuotaCost.replace("{quota}", String(generationQuotaCost))}
              </span>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !promptReady}
            className="h-12 w-full justify-between rounded-lg bg-primary px-4 text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.wsGenerating}
                </span>
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs">
                  {t.wsQuotaCost.replace("{quota}", String(generationQuotaCost))}
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center">
                  <Zap className="mr-2 h-4 w-4" />
                  {t.wsGenerateBtn}
                </span>
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs">
                  {t.wsQuotaCost.replace("{quota}", String(generationQuotaCost))}
                </span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile Composer Toggle */}
      <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden">
        <Button
          onClick={() => setShowMobileComposer(!showMobileComposer)}
          className="h-12 w-full rounded-lg bg-primary text-primary-foreground shadow-lg"
        >
          <PenTool className="h-4 w-4 mr-2" />
          {t.wsPromptTitle}
        </Button>
      </div>

      {/* Mobile Composer Drawer */}
      {showMobileComposer && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden">
          <div className="safe-bottom absolute bottom-0 left-0 right-0 max-h-[84vh] overflow-y-auto rounded-t-lg bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-border bg-white p-4">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    {currentModeLabel}
                  </p>
                  <h3 className="text-sm font-semibold">{t.wsPromptTitle}</h3>
                </div>
              <button
                onClick={() => setShowMobileComposer(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={language === "zh" ? "关闭创作面板" : "Close composer"}
              >
                <X className="h-5 w-5" />
              </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <Textarea
                placeholder={t.wsPromptPlaceholder}
                rows={20}
                className="field-sizing-fixed max-h-[60vh] resize-none overflow-y-auto rounded-lg border-border bg-muted/25 text-sm scrollbar-thin"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="grid gap-2">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(qp)}
                    className="min-h-11 rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground transition-all hover:border-brand/30 hover:bg-brand-light hover:text-foreground"
                  >
                    {qp}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => {
                  handleGenerate();
                  setShowMobileComposer(false);
                }}
                disabled={isGenerating || !promptReady}
                className="h-12 w-full justify-between rounded-lg bg-primary px-4 text-primary-foreground"
              >
                <span className="flex items-center">
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {isGenerating ? t.wsGenerating : t.wsGenerateBtn}
                </span>
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs">
                  {t.wsQuotaCost.replace("{quota}", String(generationQuotaCost))}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Canvas */}
      <main className="relative flex h-full flex-1 flex-col bg-canvas">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 bg-white/70 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isGenerating ? "animate-pulse bg-amber-400" : "bg-emerald-500"
              }`}
            />
            <span className="text-xs font-semibold text-foreground">
              {isGenerating ? t.wsGenerating : t.wsCurrentTask}
            </span>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span className="rounded-md border border-border bg-white px-2 py-1 font-medium">
              {currentModeLabel}
            </span>
            <span className="rounded-md border border-border bg-white px-2 py-1 font-medium">
              {promptCharCount}
            </span>
          </div>
        </div>

        <div className="studio-canvas flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Canvas Area */}
          <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center">
            {!currentTask ? (
              /* Empty State - Creative Starter Zone */
              <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-lg border border-brand/15 bg-brand-light">
                    <Sparkles className="h-6 w-6 text-brand" />
                  </div>
                  <h2 className="text-2xl font-semibold sm:text-3xl">
                    {t.wsEmptyTitle}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground lg:text-base">
                    {t.wsEmptyDesc}
                  </p>

                  {/* Quick start suggestions */}
                  <div className="mt-8 w-full space-y-3">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                      {t.wsEmptyHint1}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {QUICK_PROMPTS.slice(0, 4).map((qp, i) => (
                        <button
                          key={i}
                          onClick={() => setPrompt(qp)}
                          className="group flex min-h-[72px] items-start justify-between gap-3 rounded-lg border border-border bg-white p-3 text-left shadow-sm shadow-zinc-950/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-md"
                        >
                          <p className="line-clamp-3 text-xs leading-relaxed text-foreground transition-colors group-hover:text-brand">
                            {qp}
                          </p>
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="rounded-lg border border-border bg-white p-3 shadow-sm shadow-zinc-950/[0.03]">
                    <div className="studio-preview-grid aspect-[4/5] overflow-hidden rounded-md border border-border/70 bg-muted/30 p-3">
                      <div className="grid h-full grid-cols-2 gap-3">
                        <div className="col-span-2 rounded-md bg-[linear-gradient(135deg,#fff7ed,#fdf2f8_48%,#eef2ff)] p-3">
                          <div className="flex h-full flex-col justify-between">
                            <Palette className="h-5 w-5 text-brand" />
                            <div>
                              <div className="h-2 w-24 rounded bg-white/80" />
                              <div className="mt-2 h-2 w-16 rounded bg-white/60" />
                            </div>
                          </div>
                        </div>
                        <div className="rounded-md bg-[linear-gradient(145deg,#ecfeff,#f0fdf4)]" />
                        <div className="rounded-md bg-[linear-gradient(145deg,#faf5ff,#fff7ed)]" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        PhantomDraw
                      </span>
                      <span className="text-muted-foreground">
                        {currentModeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Task Result */
              <div className="w-full max-w-3xl">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-3 shadow-sm shadow-zinc-950/[0.04]">
                  {(currentTask.status === "pending" ||
                    currentTask.status === "running") && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg border border-brand/15 bg-brand-light">
                        <Loader2 className="h-8 w-8 animate-spin text-brand" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {t.wsDrawing}
                      </p>
                      <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
                      </div>
                    </div>
                  )}

                  {currentTask.status === "failed" && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white p-6 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-destructive/10">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                      </div>
                      <p className="font-semibold text-foreground">
                        {t.wsGenerateFailed}
                      </p>
                      <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                        {currentTask.errorReason}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 rounded-lg"
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
                    <div className="group relative h-full w-full overflow-hidden rounded-md bg-muted/20">
                      <Image
                        src={currentTask.imageUrl}
                        alt={currentTask.prompt || "Generated image"}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                      <div className="absolute right-3 top-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <a
                          href={currentTask.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          aria-label={language === "zh" ? "下载图片" : "Download image"}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white/90 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-white"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                {currentTask.prompt && (
                  <div className="mt-3 rounded-lg border border-border bg-white px-4 py-3 shadow-sm shadow-zinc-950/[0.02]">
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {currentTask.prompt}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-white px-4 text-[11px] text-muted-foreground lg:px-6">
          <span className="font-mono opacity-60">
            PHANTOMDRAW v1.0
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden font-medium sm:inline">{activeModel}</span>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium">{t.wsReady}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - History & Parameters */}
      <aside className="hidden h-full w-72 flex-shrink-0 flex-col border-l border-border/80 bg-white/95 backdrop-blur lg:flex xl:w-80">
        {/* History Section */}
        <div className="flex flex-1 flex-col overflow-y-auto p-4 scrollbar-thin">
          <div className="sticky top-0 z-10 mb-4 flex items-center justify-between bg-white py-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-brand" />
              {t.wsHistoryTitle}
            </h3>
            <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
              {history.length}/10
            </span>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50">
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
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/30 transition-all duration-200 hover:border-brand/35"
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
        <div className="min-h-[156px] border-t border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
              {t.wsParamsTitle}
            </h3>
            {currentTask && (
              <span className="rounded-md bg-white px-2 py-1 font-mono text-[10px] text-muted-foreground ring-1 ring-border">
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
                {currentTask.size && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t.wsSizeTitle || "尺寸"}</span>
                    <span className="font-medium uppercase text-[11px]">
                      {currentTask.size}
                    </span>
                  </div>
                )}
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
