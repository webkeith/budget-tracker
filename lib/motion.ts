import type { Transition, Variants } from "framer-motion";

export const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };
export const softSpring: Transition = { type: "spring", stiffness: 220, damping: 30 };

export const pageVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04 } },
};

export const itemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: softSpring },
};
