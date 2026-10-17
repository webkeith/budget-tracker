"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, ShieldCheck, Smartphone } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { AppMark, SecureScreen } from "@/components/security/secure-screen";
import { GoogleButton } from "@/components/auth/google-button";

function SignInInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const next = params.get("next") ?? undefined;

  const signIn = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (err) throw err;
  };

  return (
    <SecureScreen>
      <div className="flex flex-col items-center text-center">
        <AppMark size={64} />
        <h1 className="mt-6 text-[32px] font-semibold leading-tight tracking-[-0.025em]">Budget</h1>
        <p className="mt-2 text-[16px] text-fg-2">See what you earn, owe, save, and can afford — on every device.</p>
      </div>
      <div className="mt-10">
        <GoogleButton onClick={signIn} />
        {error ? (
          <p role="alert" className="mt-3 text-center text-[13px] text-payable">
            Sign-in didn&apos;t finish. Please try again.
          </p>
        ) : null}
      </div>
      <ul className="mt-10 space-y-3 text-[14px] text-fg-2">
        <li className="flex items-start gap-3">
          <Lock className="mt-0.5 size-[18px] shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
          Your numbers are encrypted on your device before they&apos;re saved.
        </li>
        <li className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-[18px] shrink-0 text-income" strokeWidth={1.75} aria-hidden />
          Only your passphrase can unlock them. Not even we can see them.
        </li>
        <li className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-[18px] shrink-0 text-savings" strokeWidth={1.75} aria-hidden />
          A quick PIN opens the app on devices you trust.
        </li>
      </ul>
    </SecureScreen>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}
