"use client";

import Link from "next/link";
import { useSecurity } from "@/lib/security";
import { Avatar } from "@/components/security/secure-screen";

export function AccountCard() {
  const { user, mode } = useSecurity();
  if (!user) return null;
  return (
    <Link
      href="/settings#account"
      className="mx-3 mb-4 flex items-center gap-3 rounded-[14px] border border-border bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-border-strong"
    >
      <Avatar name={user.name} src={user.avatar} size={32} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[13px] font-medium">{mode === "local" ? "Local vault" : user.name}</span>
        <span className="block truncate text-[12px] text-fg-2">{mode === "local" ? "Stored on this device" : user.email}</span>
      </span>
    </Link>
  );
}
