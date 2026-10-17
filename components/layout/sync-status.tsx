"use client";

import { useState } from "react";
import { AlertCircle, Check, CloudOff, HardDrive, Loader2, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSecurity } from "@/lib/security";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SyncStatusPill({ className }: { className?: string }) {
  const { syncStatus, sampleMode, syncNow } = useStore();
  const { mode } = useSecurity();
  const [open, setOpen] = useState(false);

  let icon = <Check className="size-3.5" aria-hidden />;
  let label = "Synced";
  let tone = "text-income";
  if (sampleMode) {
    icon = <HardDrive className="size-3.5" aria-hidden />;
    label = "Sample data";
    tone = "text-due";
  } else if (mode === "local" || syncStatus.state === "local") {
    icon = <HardDrive className="size-3.5" aria-hidden />;
    label = "On this device";
    tone = "text-fg-2";
  } else if (syncStatus.state === "syncing") {
    icon = <Loader2 className="size-3.5 animate-spin" aria-hidden />;
    label = "Syncing…";
    tone = "text-fg-2";
  } else if (syncStatus.state === "offline") {
    icon = <CloudOff className="size-3.5" aria-hidden />;
    label = "Offline";
    tone = "text-due";
  } else if (syncStatus.state === "error" || syncStatus.unreadable) {
    icon = <AlertCircle className="size-3.5" aria-hidden />;
    label = "Sync error";
    tone = "text-payable";
  }

  const detail = sampleMode
    ? "You're viewing sample numbers. Nothing here is saved or synced. Turn off sample data in Settings to see your own budget."
    : mode === "local"
      ? "Supabase isn't configured, so your encrypted data is stored only in this browser. Export a backup now and then."
      : syncStatus.state === "offline"
        ? `You're offline. ${syncStatus.pending ? `${syncStatus.pending} change${syncStatus.pending === 1 ? "" : "s"} saved on this device` : "Changes are saved on this device"} and will sync when you're back online.`
        : syncStatus.state === "error"
          ? syncStatus.error ?? "Something went wrong while syncing. We'll keep retrying."
          : syncStatus.state === "syncing"
            ? "Encrypting and syncing your changes."
            : `Everything is encrypted and up to date${syncStatus.lastSyncedAt ? ` as of ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}.`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-white/[0.04] px-3.5 text-[13px] font-medium transition-colors hover:border-border-strong", tone, className)}
        aria-label={`Sync status: ${label}. Tap for details.`}
      >
        {icon}
        <span>{label}</span>
        {syncStatus.pending > 0 && !sampleMode && mode !== "local" ? <span className="num text-fg-2">· {syncStatus.pending}</span> : null}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={label} description="Sync status">
        <p className="text-[15px] text-fg-2">{detail}</p>
        {syncStatus.unreadable ? (
          <p className="mt-3 rounded-[12px] bg-payable/10 px-3 py-2.5 text-[13px] text-fg">
            {syncStatus.unreadable} item{syncStatus.unreadable === 1 ? "" : "s"} couldn&apos;t be decrypted and {syncStatus.unreadable === 1 ? "was" : "were"} skipped. They may have been saved with a different vault.
          </p>
        ) : null}
        {mode === "supabase" && !sampleMode ? (
          <Button
            className="mt-5 w-full"
            variant="secondary"
            onClick={() => {
              syncNow();
              setOpen(false);
            }}
          >
            <RefreshCw aria-hidden />
            Sync now
          </Button>
        ) : null}
      </Sheet>
    </>
  );
}
