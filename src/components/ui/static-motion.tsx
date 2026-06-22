"use client";

import { createElement, forwardRef } from "react";

// Drop-in replacement for framer-motion's `motion.*` on public/SEO pages so the
// heavy framer-motion bundle is NOT shipped there. It renders the underlying HTML
// element and discards animation-only props. Components are cached per tag so the
// element type is stable across renders (no remount churn). Content renders
// immediately (no entrance animation), which is fine for SEO/above-the-fold text.

const FRAMER_PROPS = new Set([
  "initial", "animate", "exit", "transition", "variants",
  "whileHover", "whileTap", "whileInView", "whileFocus", "whileDrag",
  "viewport", "layout", "layoutId", "drag", "dragConstraints",
  "onAnimationStart", "onAnimationComplete", "custom",
]);

const cache: Record<string, any> = {};

function makeTag(tag: string) {
  const Comp = forwardRef<any, any>((props, ref) => {
    const domProps: Record<string, unknown> = {};
    for (const key in props) {
      if (!FRAMER_PROPS.has(key)) domProps[key] = props[key];
    }
    return createElement(tag, { ...domProps, ref });
  });
  Comp.displayName = `motion.${tag}`;
  return Comp;
}

export const motion: any = new Proxy(
  {},
  {
    get: (_t, tag: string) => (cache[tag] ||= makeTag(tag)),
  },
);
