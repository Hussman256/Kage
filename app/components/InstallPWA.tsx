"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
};

export const InstallPWA = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isInStandalone, setIsInStandalone] = useState(false);

  useEffect(() => {
    setIsIOSDevice(isIOS());
    setIsInStandalone(isStandalone());

    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e as BeforeInstallPromptEvent);
    };
    
    window.addEventListener("beforeinstallprompt", handler);

    // For iOS devices, show install instructions if not in standalone mode
    if (isIOS() && !isStandalone()) {
      setShowIOSInstructions(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = (evt: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    evt.preventDefault();
    if (!promptInstall) {
      return;
    }
    promptInstall.prompt();
  };

  const onIOSInstructionsClick = () => {
    setShowIOSInstructions(!showIOSInstructions);
  };

  // Don't show anything if already installed (standalone mode)
  if (isInStandalone) {
    return null;
  }

  // Don't show anything if no PWA support and not iOS
  if (!supportsPWA && !isIOSDevice) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 max-w-[calc(100vw-2rem)]">
      <div className="max-w-sm rounded-2xl border p-4" style={{ background: "var(--panel)", borderColor: "var(--a14)", boxShadow: "0 20px 50px -20px var(--shadow1)" }}>
        <div className="flex items-center gap-3">
          <div className="font-jp flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold" style={{ background: "rgba(131,110,249,.18)", color: "var(--purpInk)" }}>
            影
          </div>
          <div className="flex-1">
            <h4 className="m-0 text-sm font-semibold">Install Kage</h4>
            <p className="m-0 text-xs" style={{ color: "var(--ink4)" }}>
              {isIOSDevice ? "Add to Home Screen" : "Add to home screen"}
            </p>
          </div>
          {supportsPWA && !isIOSDevice ? (
            <button
              onClick={onClick}
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-inv"
              style={{ background: "var(--purp)" }}
            >
              Install
            </button>
          ) : isIOSDevice ? (
            <button
              onClick={onIOSInstructionsClick}
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-inv"
              style={{ background: "var(--purp)" }}
            >
              How?
            </button>
          ) : null}
        </div>

        {showIOSInstructions && isIOSDevice && (
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--a08)" }}>
            <div className="space-y-2 text-xs" style={{ color: "var(--ink3)" }}>
              <p className="font-semibold" style={{ color: "var(--ink)" }}>To install this app on iOS:</p>
              <div className="space-y-1">
                <p>1. Tap the Share button <span className="inline-block">📤</span></p>
                <p>2. Scroll down and tap &quot;Add to Home Screen&quot;</p>
                <p>3. Tap &quot;Add&quot; to confirm</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
