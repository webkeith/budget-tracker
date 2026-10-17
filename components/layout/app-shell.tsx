"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { StoreProvider, useStore } from "@/lib/store";
import { SecurityProvider, useSecurity } from "@/lib/security";
import { PrivacyProvider } from "@/lib/privacy";
import { Sidebar } from "@/components/layout/sidebar";
import { TabBar } from "@/components/layout/tab-bar";
import { Editor } from "@/components/modules/editor";
import { QuickAdd } from "@/components/modules/quick-add";
import { Toaster } from "@/components/ui/toaster";
import { Onboarding } from "@/components/security/onboarding";
import { LockScreen, NeedsPinScreen } from "@/components/security/lock-screen";
import { PrivacyOverlay } from "@/components/security/privacy-overlay";
import { AppMark, SecureScreen } from "@/components/security/secure-screen";
import { LegacyImportPrompt } from "@/components/security/legacy-import";
import { ClientSheets } from "@/components/modules/clients/sheets";

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your budget" className="mx-auto w-full max-w-[1280px] animate-pulse">
      <div className="h-9 w-48 rounded-[10px] bg-white/[0.06]" />
      <div className="mt-6 h-56 rounded-[20px] bg-white/[0.04]" />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-[20px] bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { ready } = useStore();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-[10px] focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Sidebar />
      <main
        id="main"
        className="min-h-dvh px-4 pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+32px)] pt-[max(20px,env(safe-area-inset-top))] sm:px-6 lg:pb-12 lg:pl-[calc(var(--sidebar-width)+40px)] lg:pr-10 lg:pt-10"
      >
        {ready ? children : <Skeleton />}
      </main>
      <TabBar />
      <Editor />
      <QuickAdd />
      <ClientSheets />
      {ready ? <LegacyImportPrompt /> : null}
      <Toaster />
    </>
  );
}

function Splash({ message }: { message?: string }) {
  return (
    <SecureScreen>
      <div className="flex flex-col items-center text-center" aria-busy={!message}>
        <AppMark size={64} />
        {message ? (
          <p className="mt-6 text-[15px] text-fg-2" role="alert">
            {message}
          </p>
        ) : (
          <Loader2 className="mt-8 size-5 animate-spin text-fg-2" aria-label="Loading" />
        )}
      </div>
    </SecureScreen>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { phase, engine, error } = useSecurity();
  switch (phase) {
    case "onboarding":
      return <Onboarding />;
    case "locked":
      return <LockScreen />;
    case "needs-pin":
      return <NeedsPinScreen />;
    case "unlocked":
      return (
        <StoreProvider engine={engine}>
          <Shell>{children}</Shell>
        </StoreProvider>
      );
    case "error":
      return <Splash message={error} />;
    default:
      return <Splash />;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname.startsWith("/sign-in") || pathname.startsWith("/auth");
  return (
    <PrivacyProvider>
      {isPublic ? (
        children
      ) : (
        <SecurityProvider>
          <Gate>{children}</Gate>
        </SecurityProvider>
      )}
      <PrivacyOverlay />
    </PrivacyProvider>
  );
}
