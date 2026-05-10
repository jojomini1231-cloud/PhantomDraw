"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { fetchApi } from "@/lib/api";
import {
  Loader2,
  MessageCircle,
  Key,
  Sparkles,
  ArrowRight,
  Hexagon,
  Globe,
} from "lucide-react";

export default function LoginPage() {
  const [apiKey, setApiKeyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { token, setAuth } = useAuthStore();
  const { language, toggleLanguage } = useLangStore();
  const t = translations[language];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (mounted && token) {
      router.replace("/");
    }
  }, [mounted, token, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;

    setLoading(true);
    try {
      const data = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ apiKey }),
      });
      const redirect =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirect")
          : null;
      const nextPath = redirect?.startsWith("/") ? redirect : "/";
      setAuth(data.accessToken, apiKey, data.quota, data.multiplier);
      toast.success(t.loginSuccess);
      router.push(nextPath);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Left: Brand Canvas */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-primary">
        {/* Gradient mesh background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-brand/20 blur-[120px] -translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-purple/20 blur-[100px] translate-x-1/4 translate-y-1/4" />
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-brand/10 blur-[80px] -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/10">
              <Hexagon className="h-6 w-6 text-white fill-white/20" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">
              PhantomDraw
            </span>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
              {language === "zh" ? "将想象变为画面" : "Turn imagination into visuals"}
            </h1>
            <p className="text-lg text-white/60 leading-relaxed mb-10">
              {language === "zh"
                ? "PhantomDraw 是一个 AI 图像创作平台，用简单的文字描述即可生成高质量的创意作品。"
                : "PhantomDraw is an AI image creation platform. Generate high-quality creative works with simple text descriptions."}
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {[
                language === "zh" ? "文字生成图片" : "Text to Image",
                language === "zh" ? "图生图" : "Image to Image",
                language === "zh" ? "AI 提示词优化" : "AI Prompt Optimize",
                language === "zh" ? "灵感画廊" : "Inspiration Gallery",
              ].map((feature) => (
                <span
                  key={feature}
                  className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-sm border border-white/10"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom attribution */}
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <Sparkles className="h-4 w-4" />
            <span>Powered by AI</span>
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12 relative">
        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-border text-sm text-muted-foreground active:text-foreground active:border-foreground/20 sm:hover:text-foreground sm:hover:border-foreground/20 transition-colors"
        >
          <Globe className="h-3.5 w-3.5" />
          {language === "zh" ? "EN" : "中文"}
        </button>

        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-6 sm:mb-8 lg:hidden">
            <div className="bg-primary rounded-xl p-2">
              <Hexagon className="h-5 w-5 text-primary-foreground fill-primary-foreground/20" />
            </div>
            <span className="font-bold text-xl tracking-tight">PhantomDraw</span>
          </div>

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              {t.loginSubtitle}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t.loginTagline}
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5 sm:mb-6 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger
                value="login"
                className="rounded-md text-sm h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Key className="h-3.5 w-3.5 mr-1.5" />
                {t.loginTabLogin}
              </TabsTrigger>
              <TabsTrigger
                value="generate"
                className="rounded-md text-sm h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {t.loginTabGenerate}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    API Key
                  </label>
                  <Input
                    type="password"
                    placeholder={t.loginInputPlaceholder}
                    value={apiKey}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    required
                    className="h-11 bg-white border-border focus-visible:ring-2 focus-visible:ring-primary"
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {loading ? t.loginLoading : t.loginBtnEnter}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="generate" className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.loginGenDesc}
                </p>
              </div>
              <Button
                onClick={() => setShowContactModal(true)}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium"
                variant="default"
                disabled={loading}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {t.loginBtnGen}
              </Button>
            </TabsContent>
          </Tabs>

          {/* Footer hint */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            {language === "zh"
              ? "登录即表示你同意我们的服务条款"
              : "By logging in, you agree to our Terms of Service"}
          </p>
        </div>
      </div>

      {/* Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md bg-white border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Key className="h-5 w-5 text-brand" />
              {t.loginContactTitle}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-1">
              {t.loginContactDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border active:border-brand/30 sm:hover:border-brand/30 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-lg">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium text-sm">{t.loginContactWeChat}</span>
              </div>
              <span className="text-muted-foreground font-mono text-sm select-all">
                phantomdraw_ai
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border active:border-purple/30 sm:hover:border-purple/30 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium text-sm">{t.loginContactQQ}</span>
              </div>
              <span className="text-muted-foreground font-mono text-sm select-all">
                123456789
              </span>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                />
              }
            >
              {t.loginContactClose}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
