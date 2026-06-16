"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  index?: number;
  variant?: "default" | "accent";
}

export function QuickAction({ 
  icon: Icon, 
  label, 
  onClick, 
  index = 0,
  variant = "default" 
}: QuickActionProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-300 group w-full",
        variant === "default" && "bg-muted/50 hover:bg-gradient-to-r hover:from-accent/10 hover:to-transparent",
        variant === "accent" && "bg-gradient-to-r from-accent to-amber-light text-white shadow-accent"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
        variant === "default" && "bg-accent/10 group-hover:bg-accent group-hover:shadow-lg",
        variant === "accent" && "bg-white/20"
      )}>
        <Icon className={cn(
          "w-5 h-5 transition-colors duration-300",
          variant === "default" && "text-accent group-hover:text-white",
          variant === "accent" && "text-white"
        )} />
      </div>
      <span className={cn(
        "font-medium transition-colors duration-300",
        variant === "default" && "text-foreground group-hover:text-accent",
        variant === "accent" && "text-white"
      )}>
        {label}
      </span>
    </motion.button>
  );
}
