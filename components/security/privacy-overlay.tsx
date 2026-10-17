"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePrivacy } from "@/lib/privacy";
import { AppMark } from "@/components/security/secure-screen";

export function PrivacyOverlay() {
  const { backgrounded } = usePrivacy();
  return (
    <AnimatePresence>
      {backgrounded ? (
        <motion.div
          key="privacy-overlay"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(10,10,11,0.55)] backdrop-blur-[40px] backdrop-saturate-150"
        >
          <AppMark size={64} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
