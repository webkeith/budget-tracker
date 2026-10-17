"use client";

import { Plus } from "lucide-react";
import type { ModuleKey } from "@/types";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/modules";

export function AddButton({ module, label, preset }: { module: ModuleKey; label?: string; preset?: Record<string, unknown> }) {
  const { openEditor } = useStore();
  return (
    <Button size="sm" className="h-11" onClick={() => openEditor({ module, preset })}>
      <Plus aria-hidden />
      {label ?? `Add ${MODULES[module].singular.toLowerCase()}`}
    </Button>
  );
}
