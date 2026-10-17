"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useIsDesktop } from "@/lib/use-media";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  "glass fixed z-50 flex flex-col border border-border shadow-float outline-none",
                  desktop
                    ? "left-1/2 top-1/2 max-h-[min(86vh,820px)] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-[24px]"
                    : "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[24px] border-b-0",
                  "bg-[var(--glass-strong)]",
                  className,
                )}
                initial={desktop ? { opacity: 0, scale: reduce ? 1 : 0.96 } : { y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
                animate={desktop ? { opacity: 1, scale: 1 } : { y: 0, opacity: 1 }}
                exit={desktop ? { opacity: 0, scale: reduce ? 1 : 0.97 } : { y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
                transition={spring}
                drag={desktop || reduce ? false : "y"}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={onDragEnd}
              >
                {!desktop ? (
                  <div aria-hidden className="flex justify-center pb-1 pt-2.5">
                    <span className="h-[5px] w-9 rounded-full bg-white/20" />
                  </div>
                ) : null}
                <div className={cn("flex items-start justify-between gap-4 px-5", desktop ? "pt-5" : "pt-1")}>
                  <div>
                    <Dialog.Title className="text-[20px] font-semibold tracking-[-0.01em]">{title}</Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-0.5 text-[13px] text-fg-2">{description}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="-mr-1.5 inline-flex size-11 items-center justify-center rounded-full text-fg-2 transition-colors hover:bg-white/[0.08] hover:text-fg"
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/[0.08]">
                      <X className="size-4" strokeWidth={2} />
                    </span>
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4">{children}</div>
                {footer ? (
                  <div className="border-t border-border px-5 py-4" style={{ paddingBottom: desktop ? undefined : "max(16px, env(safe-area-inset-bottom))" }}>
                    {footer}
                  </div>
                ) : null}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
