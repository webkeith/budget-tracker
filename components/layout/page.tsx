"use client";

import { motion } from "framer-motion";
import { pageVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className={cn("mx-auto w-full max-w-[1280px]", className)}>
      {children}
    </motion.div>
  );
}
