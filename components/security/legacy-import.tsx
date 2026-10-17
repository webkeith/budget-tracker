"use client";

import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { useStore } from "@/lib/store";
import { clearLegacyData, readLegacyData } from "@/lib/security";
import { applyChanges, snapshotChanges } from "@/lib/sync-core";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "budget-tracker:legacy-dismissed";

export function LegacyImportPrompt() {
  const { mutate, sampleMode, toast } = useStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sampleMode) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      return;
    }
    if (readLegacyData()) setOpen(true);
  }, [sampleMode]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? setOpen(true) : dismiss())}
      title="Bring your existing data into your account"
      description="We found an unencrypted budget saved in this browser from an earlier version."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            className="text-payable hover:text-payable"
            onClick={() => {
              clearLegacyData();
              setOpen(false);
              toast("Old copy deleted from this browser");
            }}
          >
            Delete it
          </Button>
          <Button variant="secondary" onClick={dismiss}>
            Not now
          </Button>
          <Button
            onClick={() => {
              const legacy = readLegacyData();
              if (legacy) {
                mutate((d) => ({ ...applyChanges(d, snapshotChanges(legacy)), settings: d.settings }));
                clearLegacyData();
                toast("Imported and encrypted", "success");
              }
              setOpen(false);
            }}
          >
            Import & encrypt
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3 rounded-[14px] bg-white/[0.03] p-4 text-[14px] text-fg-2">
        <Database className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <p>
          Importing encrypts every entry with your vault key and adds it to your account. The unencrypted copy is then removed from this browser. Items with the same ID are
          updated, nothing is duplicated.
        </p>
      </div>
    </Sheet>
  );
}
