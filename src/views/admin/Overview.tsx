"use client";

import Link from "next/link";
import { formatDateSafe } from "@/utils/formatDate";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import {
  Package,
  MessageSquare,
  Calendar,
  Users,
  Eye,
  ArrowRight,
  Sparkles,
  Loader2,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/admin/StatCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";
import { QuickAction } from "@/components/admin/QuickAction";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Enquiry, Appointment } from "@/types/database";

const quickActions = [
  { icon: Package, label: "Add Product", href: "/admin/products" },
  { icon: MessageSquare, label: "View Enquiries", href: "/admin/enquiries" },
  { icon: Calendar, label: "Appointments", href: "/admin/appointments" },
  { icon: Eye, label: "View Website", href: "/" },
];

const statusColors: Record<string, string> = {
  new: "bg-gradient-to-r from-blue-500 to-blue-400 text-white",
  read: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  responded: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function AdminOverview() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    newEnquiries: 0,
    pendingAppointments: 0,
    totalEnquiries: 0,
  });
  const [recentEnquiries, setRecentEnquiries] = useState<Enquiry[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions
    const enquiriesChannel = supabase
      .channel('overview-enquiries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const appointmentsChannel = supabase
      .channel('overview-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(enquiriesChannel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products count
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Fetch enquiries
      const { data: enquiriesData, count: enquiriesCount } = await supabase
        .from("enquiries")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(5);

      const newEnquiriesCount = enquiriesData?.filter(e => e.status === "new").length || 0;

      // Fetch appointments
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*")
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(5);

      const pendingCount = appointmentsData?.filter(a => a.status === "pending").length || 0;

      setStats({
        totalProducts: productsCount || 0,
        newEnquiries: newEnquiriesCount,
        pendingAppointments: pendingCount,
        totalEnquiries: enquiriesCount || 0,
      });

      setRecentEnquiries((enquiriesData as Enquiry[]) || []);
      setUpcomingAppointments((appointmentsData as Appointment[]) || []);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Total Products",
      value: stats.totalProducts.toString(),
      change: "",
      trend: "up" as const,
      icon: Package,
      gradient: "amber" as const,
    },
    {
      title: "New Enquiries",
      value: stats.newEnquiries.toString(),
      change: "",
      trend: "up" as const,
      icon: MessageSquare,
      gradient: "blue" as const,
    },
    {
      title: "Pending Appointments",
      value: stats.pendingAppointments.toString(),
      change: "",
      trend: "up" as const,
      icon: Calendar,
      gradient: "purple" as const,
    },
    {
      title: "Total Enquiries",
      value: stats.totalEnquiries.toString(),
      change: "",
      trend: "up" as const,
      icon: Users,
      gradient: "green" as const,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-accent" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening with your business."
        badge={
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-accent to-amber-light text-white text-sm font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Live
          </motion.span>
        }
      />

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <StatCard key={stat.title} {...stat} index={index} />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Enquiries */}
        <AdminCard delay={0.2} gradient>
          <AdminCardHeader
            action={
              <Button variant="ghost" size="sm" asChild className="text-accent hover:text-accent">
                <Link href="/admin/enquiries">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          >
            Recent Enquiries
          </AdminCardHeader>
          <AdminCardContent className="space-y-3">
            {recentEnquiries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No enquiries yet</p>
              </div>
            ) : (
              recentEnquiries.map((enquiry, index) => (
                <motion.div
                  key={enquiry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-gradient-to-r hover:from-accent/5 hover:to-transparent transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                      enquiry.status === "new"
                        ? "bg-gradient-to-br from-blue-500 to-blue-400 text-white"
                        : "bg-gradient-to-br from-accent/20 to-accent/5 text-accent group-hover:from-accent group-hover:to-amber-light group-hover:text-white"
                    )}>
                      <span className="font-bold">
                        {enquiry.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{enquiry.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {enquiry.product_name || enquiry.subject || "General Enquiry"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge className={cn("font-semibold", statusColors[enquiry.status])}>
                      {enquiry.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDateSafe(new Date(enquiry.created_at), "MMM d, h:mm a")}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AdminCardContent>
        </AdminCard>

        {/* Upcoming Appointments */}
        <AdminCard delay={0.3} gradient>
          <AdminCardHeader
            action={
              <Button variant="ghost" size="sm" asChild className="text-accent hover:text-accent">
                <Link href="/admin/appointments">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
          >
            Upcoming Appointments
          </AdminCardHeader>
          <AdminCardContent className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No upcoming appointments</p>
              </div>
            ) : (
              upcomingAppointments.map((apt, index) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-gradient-to-r hover:from-accent/5 hover:to-transparent transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center group-hover:from-accent group-hover:to-amber-light transition-all duration-300">
                      <Calendar className="h-5 w-5 text-accent group-hover:text-white transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{apt.customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {apt.service_type}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge className={cn("font-semibold", statusColors[apt.status])}>
                      {apt.status}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDateSafe(new Date(apt.appointment_date), "MMM d")} at {apt.appointment_time}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AdminCardContent>
        </AdminCard>
      </div>

      {/* Quick Actions */}
      <AdminCard delay={0.4}>
        <AdminCardHeader>Quick Actions</AdminCardHeader>
        <AdminCardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link key={action.label} href={action.href}>
                <QuickAction
                  icon={action.icon}
                  label={action.label}
                  index={index}
                />
              </Link>
            ))}
          </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}
