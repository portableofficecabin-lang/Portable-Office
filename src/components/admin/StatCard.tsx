"use client";

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
  index?: number;
  gradient?: "amber" | "blue" | "green" | "purple";
}

const gradientClasses = {
  amber: "from-amber to-amber-light",
  blue: "from-blue-500 to-blue-400",
  green: "from-emerald-500 to-emerald-400",
  purple: "from-purple-500 to-purple-400",
};

export function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  index = 0,
  gradient = "amber",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="relative overflow-hidden bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-shadow"
    >
      {/* Gradient accent bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", gradientClasses[gradient])} />
      
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
              className="font-display text-4xl font-bold text-foreground mt-2"
            >
              {value}
            </motion.p>
          </div>
          <motion.div
            initial={{ rotate: -15, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 + 0.1 }}
            className={cn(
              "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
              gradientClasses[gradient]
            )}
          >
            <Icon className="w-7 h-7 text-white" />
          </motion.div>
        </div>
        
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
              trend === "up" 
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {trend === "up" ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {change}
          </motion.div>
          <span className="text-muted-foreground text-sm">vs last month</span>
        </div>
      </div>
    </motion.div>
  );
}
