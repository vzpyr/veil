import type { Variants } from "motion/react";

export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
} as const;

const ease = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.4, 0, 0.2, 1],
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.out },
  },
  exit: {
    opacity: 0,
    y: 12,
    transition: { duration: duration.fast, ease: ease.inOut },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.normal, ease: ease.out },
  },
  exit: {
    opacity: 0,
    x: 24,
    transition: { duration: duration.fast, ease: ease.inOut },
  },
};

export const tabContent: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.out },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: duration.fast, ease: ease.inOut },
  },
};

export const staggerContainer = (
  stagger = 0.04,
  delayChildren = 0.05,
): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

export const staggerItem = (step = 0.025, maxDelay = 0.3): Variants => ({
  hidden: { opacity: 0, y: 12 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: ease.out,
      delay: Math.min(index * step, maxDelay),
    },
  }),
});
