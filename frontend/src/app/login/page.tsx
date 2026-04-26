"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { fetchApi } from "@/lib/api";
import { Loader2, MessageCircle, Info } from "lucide-react";

export default function LoginPage() {
  const [apiKey, setApiKeyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { token, setAuth } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language];

  useEffect(() => {
    setMounted(true);
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
      setAuth(data.accessToken, apiKey, data.quota);
      toast.success(t.loginSuccess);
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    setShowContactModal(true);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md shadow-2xl border-white/10 bg-white">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tighter text-slate-800">{t.loginTitle}</CardTitle>
          <CardDescription className="text-slate-500">{t.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100">
              <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">{t.loginTabLogin}</TabsTrigger>
              <TabsTrigger value="generate" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">{t.loginTabGenerate}</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder={t.loginInputPlaceholder}
                    value={apiKey}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t.loginBtnEnter}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="generate" className="flex flex-col space-y-4">
              <p className="text-sm text-slate-500 text-center mb-4">
                {t.loginGenDesc}
              </p>
              <Button onClick={handleGenerateKey} className="w-full bg-slate-800 hover:bg-slate-900 text-white" variant="secondary" disabled={loading}>
                {t.loginBtnGen}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="sm:max-w-md bg-white border-slate-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
              <Info className="h-5 w-5 text-blue-500" />
              {t.loginContactTitle}
            </DialogTitle>
            <DialogDescription className="text-slate-500 pt-2 text-base">
              {t.loginContactDesc}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-full">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium text-slate-700">{t.loginContactWeChat}</span>
              </div>
              <span className="text-slate-500 font-mono font-medium select-all">phantomdraw_ai</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-full">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium text-slate-700">{t.loginContactQQ}</span>
              </div>
              <span className="text-slate-500 font-mono font-medium select-all">123456789</span>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-center">
            <DialogClose>
              <Button type="button" variant="secondary" className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-900 border-0">
                {t.loginContactClose}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
