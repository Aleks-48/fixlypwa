"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Download,PlusSquare,Share,X } from "lucide-react";
import { useEffect,useState } from "react";

interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

export function PwaInstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua);
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as InstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (isIosDevice && !localStorage.getItem("pwa_ios_prompt_dismissed")) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(!showIosGuide);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIos) {
      localStorage.setItem("pwa_ios_prompt_dismissed", "true");
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <Card className="rounded-2xl border border-primary/20 bg-background/95 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md">
              Fixly
            </div>
            <div>
              <h4 className="m-0 font-bold text-sm">{t("pwa_install_title")}</h4>
              <p className="m-0 text-xs text-muted-foreground">
                {t("pwa_install_subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 rounded-full"
            aria-label={t("btn_close")}
          >
            <X size={16} />
          </button>
        </div>

        {showIosGuide && isIos && (
          <div className="mt-3 p-3 rounded-xl bg-secondary/80 text-xs space-y-2 border border-border/60 animate-in fade-in duration-200">
            <p className="font-semibold text-primary flex items-center gap-1.5">
              {t("pwa_ios_guide_title")}
            </p>
            <ol className="m-0 list-decimal list-inside space-y-1 text-muted-foreground">
              <li className="inline-flex items-center gap-1">
                {t("pwa_ios_step1")} <Share size={13} className="text-primary inline" /> &quot;{t("pwa_ios_share")}&quot;
              </li>
              <li className="inline-flex items-center gap-1">
                {t("pwa_ios_step2")} <PlusSquare size={13} className="text-primary inline" /> &quot;{t("pwa_ios_add_home")}&quot;
              </li>
            </ol>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="w-full rounded-xl gap-2 font-medium text-xs shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Download size={14} />
            {isIos ? t("pwa_btn_ios") : t("pwa_btn_android")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
