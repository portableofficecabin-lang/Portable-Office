"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AdminCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  delay?: number;
}

export function AdminCard({ 
  children, 
  className, 
  gradient = false,
  delay = 0,
  ...props 
}: AdminCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative overflow-hidden bg-card rounded-2xl shadow-card",
        gradient && "before:absolute before:inset-0 before:bg-gradient-to-br before:from-accent/5 before:to-transparent before:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface AdminCardHeaderProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function AdminCardHeader({ children, className, action }: AdminCardHeaderProps) {
  return (
    <div className={cn("px-6 py-5 border-b border-border flex items-center justify-between", className)}>
      <h2 className="font-display text-lg font-bold text-foreground">{children}</h2>
      {action}
    </div>
  );
}

interface AdminCardContentProps {
  children: ReactNode;
  className?: string;
}

export function AdminCardContent({ children, className }: AdminCardContentProps) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}
