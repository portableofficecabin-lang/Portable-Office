"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { format, subDays } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  Clock,
  MousePointerClick,
  Users,
  FileText,
  Loader2,
  Calendar,
  Globe,
  MapPin,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PageView {
  id: string;
  visitor_id: string;
  page_path: string;
  page_title: string | null;
  duration_seconds: number;
  created_at: string;
  referrer?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
}

interface ClickEvent {
  id: string;
  visitor_id: string;
  page_path: string;
  element_type: string;
  element_text: string | null;
  element_id: string | null;
  created_at: string;
}

interface UniqueVisitor {
  visitor_id: string;
  ip_address: string;
  country: string;
  region: string;
  city: string;
  totalPageViews: number;
  totalClicks: number;
  totalDuration: number;
  firstSeen: string;
  lastSeen: string;
  pagesVisited: string[];
}

interface PageStats {
  path: string;
  views: number;
  totalDuration: number;
  avgDuration: number;
}

interface KeywordStats {
  text: string;
  clicks: number;
  elementType: string;
}

const timeFilters = [
  { label: "1 Day", value: "1d", days: 1 },
  { label: "3 Days", value: "3d", days: 3 },
  { label: "7 Days", value: "7d", days: 7 },
  { label: "15 Days", value: "15d", days: 15 },
  { label: "1 Month", value: "1m", days: 30 },
  { label: "3 Months", value: "3m", days: 90 },
  { label: "6 Months", value: "6m", days: 180 },
  { label: "12 Months", value: "12m", days: 365 },
];

export default function AdminAnalytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [clickEvents, setClickEvents] = useState<ClickEvent[]>([]);
  const [timeFilter, setTimeFilter] = useState("7d");
  const [visitorLimit, setVisitorLimit] = useState(25);
  const [pageViewLimit, setPageViewLimit] = useState(50);
  const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null);

  const selectedFilter = timeFilters.find((f) => f.value === timeFilter) || timeFilters[2];

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const startDate = subDays(new Date(), selectedFilter.days).toISOString();

      const [pageViewsRes, clickEventsRes] = await Promise.all([
        supabase
          .from("page_views")
          .select("*")
          .gte("created_at", startDate)
          .order("created_at", { ascending: false }),
        supabase
          .from("click_events")
          .select("*")
          .gte("created_at", startDate)
          .order("created_at", { ascending: false }),
      ]);

      if (pageViewsRes.error) throw pageViewsRes.error;
      if (clickEventsRes.error) throw clickEventsRes.error;

      setPageViews((pageViewsRes.data as PageView[]) || []);
      setClickEvents((clickEventsRes.data as ClickEvent[]) || []);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      toast({ title: "Error", description: "Failed to load analytics data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const uniqueVisitors = new Set(pageViews.map((pv) => pv.visitor_id)).size;
    const totalPageViews = pageViews.length;
    const totalClicks = clickEvents.length;
    const totalDuration = pageViews.reduce((sum, pv) => sum + (pv.duration_seconds || 0), 0);
    const avgDuration = totalPageViews > 0 ? totalDuration / totalPageViews : 0;
    return { uniqueVisitors, totalPageViews, totalClicks, avgDuration: Math.round(avgDuration) };
  }, [pageViews, clickEvents]);

  // Unique visitors with full details
  const uniqueVisitors = useMemo<UniqueVisitor[]>(() => {
    const visitorMap = new Map<string, UniqueVisitor>();
    const clicksByVisitor = new Map<string, number>();

    clickEvents.forEach((ce) => {
      clicksByVisitor.set(ce.visitor_id, (clicksByVisitor.get(ce.visitor_id) || 0) + 1);
    });

    pageViews.forEach((pv) => {
      const existing = visitorMap.get(pv.visitor_id);
      if (existing) {
        existing.totalPageViews += 1;
        existing.totalDuration += pv.duration_seconds || 0;
        if (pv.created_at < existing.firstSeen) existing.firstSeen = pv.created_at;
        if (pv.created_at > existing.lastSeen) existing.lastSeen = pv.created_at;
        if (!existing.pagesVisited.includes(pv.page_path)) existing.pagesVisited.push(pv.page_path);
        if (!existing.ip_address && pv.ip_address) existing.ip_address = pv.ip_address;
        if (!existing.country && pv.country) existing.country = pv.country;
        if (!existing.region && pv.region) existing.region = pv.region;
        if (!existing.city && pv.city) existing.city = pv.city;
      } else {
        visitorMap.set(pv.visitor_id, {
          visitor_id: pv.visitor_id,
          ip_address: pv.ip_address || "—",
          country: pv.country || "—",
          region: pv.region || "—",
          city: pv.city || "—",
          totalPageViews: 1,
          totalClicks: clicksByVisitor.get(pv.visitor_id) || 0,
          totalDuration: pv.duration_seconds || 0,
          firstSeen: pv.created_at,
          lastSeen: pv.created_at,
          pagesVisited: [pv.page_path],
        });
      }
    });

    return Array.from(visitorMap.values()).sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
  }, [pageViews, clickEvents]);

  const pageStats = useMemo<PageStats[]>(() => {
    const statsMap = new Map<string, { views: number; totalDuration: number }>();
    pageViews.forEach((pv) => {
      const existing = statsMap.get(pv.page_path) || { views: 0, totalDuration: 0 };
      statsMap.set(pv.page_path, {
        views: existing.views + 1,
        totalDuration: existing.totalDuration + (pv.duration_seconds || 0),
      });
    });
    return Array.from(statsMap.entries())
      .map(([path, data]) => ({
        path,
        views: data.views,
        totalDuration: data.totalDuration,
        avgDuration: data.views > 0 ? Math.round(data.totalDuration / data.views) : 0,
      }))
      .sort((a, b) => b.views - a.views);
  }, [pageViews]);

  const keywordStats = useMemo<KeywordStats[]>(() => {
    const statsMap = new Map<string, { clicks: number; elementType: string }>();
    clickEvents.forEach((ce) => {
      if (!ce.element_text) return;
      const key = ce.element_text.toLowerCase().trim();
      const existing = statsMap.get(key) || { clicks: 0, elementType: ce.element_type };
      statsMap.set(key, { clicks: existing.clicks + 1, elementType: ce.element_type });
    });
    return Array.from(statsMap.entries())
      .map(([text, data]) => ({ text, clicks: data.clicks, elementType: data.elementType }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [clickEvents]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getPageName = (path: string) => {
    if (path === "/") return "Home";
    return path.split("/").filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" → ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="h-10 w-10 text-accent" />
        </motion.div>
      </div>
    );
  }

  const statCards = [
    { title: "Unique Visitors", value: stats.uniqueVisitors.toString(), change: "", trend: "up" as const, icon: Users, gradient: "amber" as const },
    { title: "Page Views", value: stats.totalPageViews.toString(), change: "", trend: "up" as const, icon: FileText, gradient: "blue" as const },
    { title: "Total Clicks", value: stats.totalClicks.toString(), change: "", trend: "up" as const, icon: MousePointerClick, gradient: "purple" as const },
    { title: "Avg. Time on Page", value: formatDuration(stats.avgDuration), change: "", trend: "up" as const, icon: Clock, gradient: "green" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitor Analytics"
        description="Track visitor traffic, page engagement, and user interactions"
        badge={
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-3 py-1 rounded-full bg-gradient-to-r from-accent to-amber-light text-white text-sm font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Live
          </motion.span>
        }
      />

      {/* Time Filter */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" /><span>Time Range:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {timeFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={timeFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter(filter.value)}
              className={cn("rounded-lg transition-all", timeFilter === filter.value && "bg-gradient-to-r from-accent to-amber-light text-white border-0")}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard key={stat.title} {...stat} index={index} />
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="visitors" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="visitors" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" /> Visitors
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Eye className="h-3.5 w-3.5" /> Pages
          </TabsTrigger>
          <TabsTrigger value="clicks" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <MousePointerClick className="h-3.5 w-3.5" /> Clicks
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: UNIQUE VISITORS ===== */}
        <TabsContent value="visitors">
          <AdminCard gradient>
            <AdminCardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-accent" />
                Unique Visitors — Full Details
                <Badge variant="secondary" className="ml-2">{uniqueVisitors.length} visitors</Badge>
              </div>
            </AdminCardHeader>
            <AdminCardContent>
              {uniqueVisitors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No visitors recorded yet</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">IP Address</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">State / Region</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">City</th>
                          <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pages</th>
                          <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clicks</th>
                          <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time Spent</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">First Seen</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Seen</th>
                          <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueVisitors.slice(0, visitorLimit).map((v, index) => (
                          <>
                            <tr
                              key={v.visitor_id}
                              className={cn(
                                "border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer",
                                expandedVisitor === v.visitor_id && "bg-muted/40"
                              )}
                              onClick={() => setExpandedVisitor(expandedVisitor === v.visitor_id ? null : v.visitor_id)}
                            >
                              <td className="py-3 px-3 text-muted-foreground font-mono text-xs">{index + 1}</td>
                              <td className="py-3 px-3">
                                <span className="font-mono text-foreground text-xs bg-muted px-2 py-1 rounded">{v.ip_address}</span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="text-foreground">{v.country}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-foreground">{v.region}</td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                                  <span className="text-foreground font-medium">{v.city}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <Badge variant="secondary" className="font-semibold">{v.totalPageViews}</Badge>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <Badge variant="outline" className="font-semibold text-accent border-accent/30">{v.totalClicks}</Badge>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-semibold text-accent">{formatDuration(v.totalDuration)}</span>
                              </td>
                              <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(v.firstSeen), "MMM d, h:mm a")}
                              </td>
                              <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(v.lastSeen), "MMM d, h:mm a")}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {expandedVisitor === v.visitor_id ? (
                                  <ChevronUp className="h-4 w-4 text-accent mx-auto" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground mx-auto" />
                                )}
                              </td>
                            </tr>
                            {expandedVisitor === v.visitor_id && (
                              <tr key={`${v.visitor_id}-details`}>
                                <td colSpan={11} className="py-3 px-6 bg-muted/20">
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pages Visited</p>
                                    <div className="flex flex-wrap gap-2">
                                      {v.pagesVisited.map((p) => (
                                        <Badge key={p} variant="secondary" className="text-xs">
                                          {getPageName(p)}
                                        </Badge>
                                      ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Visitor ID: <span className="font-mono">{v.visitor_id}</span>
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {uniqueVisitors.length > visitorLimit && (
                    <div className="text-center pt-4">
                      <Button variant="outline" size="sm" onClick={() => setVisitorLimit((prev) => prev + 25)}>
                        Load More ({uniqueVisitors.length - visitorLimit} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </AdminCardContent>
          </AdminCard>
        </TabsContent>

        {/* ===== TAB 2: ALL PAGE VIEWS ===== */}
        <TabsContent value="pages">
          <AdminCard gradient>
            <AdminCardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-accent" />
                All Page Views — Time Spent
                <Badge variant="secondary" className="ml-2">{pageStats.length} pages</Badge>
              </div>
            </AdminCardHeader>
            <AdminCardContent>
              {pageStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No page view data yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Page</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Views</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Time</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Time</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[200px]">Engagement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageStats.map((page, index) => {
                        const maxViews = pageStats[0]?.views || 1;
                        const pct = (page.views / maxViews) * 100;
                        return (
                          <tr key={page.path} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{index + 1}</td>
                            <td className="py-3 px-4 font-medium text-foreground">{getPageName(page.path)}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant="secondary" className="font-semibold">{page.views}</Badge>
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">{formatDuration(page.totalDuration)}</td>
                            <td className="py-3 px-4 text-center font-semibold text-accent">{formatDuration(page.avgDuration)}</td>
                            <td className="py-3 px-4">
                              <div className="h-2 bg-muted rounded-full overflow-hidden min-w-[120px]">
                                <div className="h-full bg-gradient-to-r from-accent to-amber-light rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminCardContent>
          </AdminCard>
        </TabsContent>

        {/* ===== TAB 3: TOP CLICKED KEYWORDS ===== */}
        <TabsContent value="clicks">
          <AdminCard gradient>
            <AdminCardHeader>
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-5 w-5 text-accent" />
                Top Clicked Keywords
                <Badge variant="secondary" className="ml-2">{stats.totalClicks} total clicks</Badge>
              </div>
            </AdminCardHeader>
            <AdminCardContent>
              {keywordStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MousePointerClick className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No click data yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rank</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Keyword / Element Text</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Element Type</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Clicks</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[150px]">Popularity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordStats.map((keyword, index) => {
                        const maxClicks = keywordStats[0]?.clicks || 1;
                        const pct = (keyword.clicks / maxClicks) * 100;
                        return (
                          <tr key={`${keyword.text}-${index}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                                index < 3 ? "bg-gradient-to-br from-accent to-amber-light text-white" : "bg-muted text-muted-foreground"
                              )}>
                                {index + 1}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium text-foreground max-w-[300px] truncate">{keyword.text}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant="outline" className="uppercase text-xs">{keyword.elementType}</Badge>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-accent text-lg">{keyword.clicks}</td>
                            <td className="py-3 px-4">
                              <div className="h-2 bg-muted rounded-full overflow-hidden min-w-[100px]">
                                <div className="h-full bg-gradient-to-r from-accent to-amber-light rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminCardContent>
          </AdminCard>
        </TabsContent>

        {/* ===== TAB 4: RECENT ACTIVITY LOG ===== */}
        <TabsContent value="activity">
          <AdminCard gradient>
            <AdminCardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                Recent Page Views — Full Activity Log
                <Badge variant="secondary" className="ml-2">{pageViews.length} records</Badge>
              </div>
            </AdminCardHeader>
            <AdminCardContent>
              {pageViews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No page views recorded yet</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Page</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">IP Address</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">City</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">State</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</th>
                          <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duration</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Visitor</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageViews.slice(0, pageViewLimit).map((pv) => (
                          <tr key={pv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-foreground text-sm">{getPageName(pv.page_path)}</td>
                            <td className="py-2.5 px-3"><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{pv.ip_address || "—"}</span></td>
                            <td className="py-2.5 px-3 text-foreground">{pv.city || "—"}</td>
                            <td className="py-2.5 px-3 text-foreground">{pv.region || "—"}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{pv.country || "—"}</td>
                            <td className="py-2.5 px-3 text-center font-semibold text-accent">{formatDuration(pv.duration_seconds || 0)}</td>
                            <td className="py-2.5 px-3"><span className="text-xs text-muted-foreground font-mono">{pv.visitor_id.substring(0, 12)}…</span></td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(pv.created_at), "MMM d, h:mm a")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {pageViews.length > pageViewLimit && (
                    <div className="text-center pt-4">
                      <Button variant="outline" size="sm" onClick={() => setPageViewLimit((prev) => prev + 50)}>
                        Load More ({pageViews.length - pageViewLimit} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </AdminCardContent>
          </AdminCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
