"use client";

import { useState } from "react";
import { Check, Copy, Download, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecoveryKeyCard({ value, account }: { value: string; account?: string }) {
  const [copied, setCopied] = useState(false);
  const groups = value.split("-");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const download = () => {
    const text = [
      "Budget — Recovery key",
      account ? `Account: ${account}` : "",
      `Created: ${new Date().toLocaleString()}`,
      "",
      value,
      "",
      "Keep this somewhere safe and offline. Anyone with this key and access to your account can read your budget.",
      "If you forget your passphrase, this key is the only way back in.",
    ]
      .filter((l) => l !== null)
      .join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "budget-recovery-key.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="rounded-[20px] border border-border bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-fg-2">
        <KeyRound className="size-4 text-due" aria-hidden />
        Recovery key
      </div>
      <p className="grid grid-cols-4 gap-2 font-mono text-[17px] font-semibold tracking-[0.06em] sm:text-[19px]" aria-label={`Recovery key: ${value.split("").join(" ")}`}>
        {groups.map((g, i) => (
          <span key={i} className="rounded-[10px] bg-white/[0.06] px-2 py-2 text-center">
            {g}
          </span>
        ))}
      </p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="secondary" className="flex-1" onClick={download}>
          <Download aria-hidden />
          Download
        </Button>
      </div>
    </div>
  );
}
