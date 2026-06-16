"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isPast, isToday, isTomorrow, addDays } from "date-fns";
import {
  Users, Search, Mail, Phone, Building, MapPin, Loader2, Plus, X,
  Filter, Target, PhoneCall, CalendarCheck, MessageCircle, TrendingUp,
  ArrowRight, Clock, CheckCircle2, AlertCircle, UserPlus, Globe,
  Megaphone, UserCheck, Share2, IndianRupee, Package, StickyNote,
  BarChart3, Eye, ListTodo, Headphones, PieChart, Trash2, Edit,
  ClipboardList, Bell, Activity, ShieldAlert, Wrench, FileBarChart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  product_name: string | null;
  message: string;
  pipeline_stage: string;
  expected_value: number | null;
  next_followup_at: string | null;
  lead_source: string;
  lead_status: string;
  created_at: string;
}

interface FollowUp {
  id: string;
  enquiry_id: string;
  follow_up_type: string;
  notes: string | null;
  scheduled_at: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total_amount: number | null;
  created_at: string;
  user_id: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  related_enquiry_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ServiceRequest {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  request_type: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const sourceIcons: Record<string, any> = {
  website: Globe,
  call: PhoneCall,
  whatsapp: MessageCircle,
  reference: Share2,
  ads: Megaphone,
};

const sourceColors: Record<string, string> = {
  website: "bg-blue-100 text-blue-700",
  call: "bg-green-100 text-green-700",
  whatsapp: "bg-emerald-100 text-emerald-700",
  reference: "bg-purple-100 text-purple-700",
  ads: "bg-orange-100 text-orange-700",
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700", icon: UserPlus },
  interested: { label: "Interested", color: "bg-emerald-100 text-emerald-700", icon: UserCheck },
  not_interested: { label: "Not Interested", color: "bg-rose-100 text-rose-700", icon: X },
  converted: { label: "Converted", color: "bg-amber-100 text-amber-700", icon: CheckCircle2 },
};

const pipelineStages = [
  { id: "new", label: "Enquiry", color: "from-blue-500 to-blue-400" },
  { id: "qualified", label: "Quotation", color: "from-purple-500 to-purple-400" },
  { id: "proposal", label: "Negotiation", color: "from-amber-500 to-amber-400" },
  { id: "won", label: "Order", color: "from-emerald-500 to-emerald-400" },
];

export default function AdminCRM() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [e, f, p, o, t, sr] = await Promise.all([
        supabase.from("enquiries").select("id,name,email,phone,company,product_name,message,pipeline_stage,expected_value,next_followup_at,lead_source,lead_status,created_at").order("created_at", { ascending: false }),
        supabase.from("follow_ups").select("*").order("scheduled_at", { ascending: true }),
        supabase.from("profiles").select("id,user_id,full_name,phone,company,city,state,created_at").order("created_at", { ascending: false }),
        supabase.from("orders").select("id,order_number,status,total_amount,created_at,user_id"),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("service_requests").select("*").order("created_at", { ascending: false }),
      ]);
      if (e.error) throw e.error;
      setEnquiries((e.data as Enquiry[]) || []);
      setFollowUps((f.data as FollowUp[]) || []);
      setProfiles((p.data as ProfileRow[]) || []);
      setOrders((o.data as OrderRow[]) || []);
      setTasks((t.data as Task[]) || []);
      setServiceRequests((sr.data as ServiceRequest[]) || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM – Topic Wise"
        description="Leads, follow-ups, sales pipeline & customer database in one place"
        badge={
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent to-amber-light text-white text-sm font-semibold">
            {enquiries.length} leads · {profiles.length} customers
          </span>
        }
      />

      <Tabs defaultValue="leads" className="space-y-6">
        <TabsList className="h-auto flex-wrap bg-card border-2 border-border rounded-xl p-1 gap-1">
          <TabsTrigger value="leads" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
            <Target className="h-4 w-4" /> Lead Management
          </TabsTrigger>
          <TabsTrigger value="followups" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
            <CalendarCheck className="h-4 w-4" /> Follow-Up
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
            <TrendingUp className="h-4 w-4" /> Sales Pipeline
          </TabsTrigger>
          <TabsTrigger value="customers" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
            <Users className="h-4 w-4" /> Customer Database
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
            <ListTodo className="h-4 w-4" /> Task & Reminder
          </TabsTrigger>
          <TabsTrigger value="service" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
            <Headphones className="h-4 w-4" /> Service & Support
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
            <PieChart className="h-4 w-4" /> Reports & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <LeadManagement
            enquiries={enquiries}
            setEnquiries={setEnquiries}
            search={search}
            setSearch={setSearch}
            filterSource={filterSource}
            setFilterSource={setFilterSource}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
          />
        </TabsContent>

        <TabsContent value="followups">
          <FollowUpManagement
            enquiries={enquiries}
            followUps={followUps}
            setFollowUps={setFollowUps}
          />
        </TabsContent>

        <TabsContent value="pipeline">
          <SalesPipeline enquiries={enquiries} setEnquiries={setEnquiries} />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerDatabase profiles={profiles} orders={orders} />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskReminder tasks={tasks} setTasks={setTasks} enquiries={enquiries} />
        </TabsContent>

        <TabsContent value="service">
          <ServiceSupport serviceRequests={serviceRequests} setServiceRequests={setServiceRequests} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsAnalytics enquiries={enquiries} orders={orders} tasks={tasks} serviceRequests={serviceRequests} profiles={profiles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   1. LEAD MANAGEMENT
   ══════════════════════════════════════════════════ */
function LeadManagement({
  enquiries, setEnquiries, search, setSearch, filterSource, setFilterSource, filterStatus, setFilterStatus,
}: {
  enquiries: Enquiry[]; setEnquiries: React.Dispatch<React.SetStateAction<Enquiry[]>>;
  search: string; setSearch: (v: string) => void;
  filterSource: string; setFilterSource: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
}) {
  const [selectedLead, setSelectedLead] = useState<Enquiry | null>(null);

  const filtered = enquiries.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || (e.company || "").toLowerCase().includes(q) || (e.phone || "").includes(q);
    const matchSource = filterSource === "all" || e.lead_source === filterSource;
    const matchStatus = filterStatus === "all" || e.lead_status === filterStatus;
    return matchSearch && matchSource && matchStatus;
  });

  const updateLeadStatus = async (id: string, lead_status: string) => {
    const prev = enquiries;
    setEnquiries((p) => p.map((e) => e.id === id ? { ...e, lead_status } : e));
    if (selectedLead?.id === id) setSelectedLead((s) => s ? { ...s, lead_status } : s);
    const { error } = await supabase.from("enquiries").update({ lead_status }).eq("id", id);
    if (error) { setEnquiries(prev); toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const updateLeadSource = async (id: string, lead_source: string) => {
    const prev = enquiries;
    setEnquiries((p) => p.map((e) => e.id === id ? { ...e, lead_source } : e));
    if (selectedLead?.id === id) setSelectedLead((s) => s ? { ...s, lead_source } : s);
    const { error } = await supabase.from("enquiries").update({ lead_source }).eq("id", id);
    if (error) { setEnquiries(prev); toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  // Stats
  const bySource = enquiries.reduce((acc, e) => { acc[e.lead_source] = (acc[e.lead_source] || 0) + 1; return acc; }, {} as Record<string, number>);
  const byStatus = enquiries.reduce((acc, e) => { acc[e.lead_status] = (acc[e.lead_status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border-2 border-border bg-card hover:border-accent/50 transition-all cursor-pointer"
              onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", cfg.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{byStatus[key] || 0}</div>
                  <div className="text-xs text-muted-foreground">{cfg.label}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11 h-11 rounded-xl border-2" />
        </div>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40 h-11 rounded-xl border-2"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="reference">Reference</SelectItem>
            <SelectItem value="ads">Ads</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-11 rounded-xl border-2"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="not_interested">Not Interested</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Two-column: Lead List + Detail */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lead List */}
        <AdminCard>
          <AdminCardHeader>Leads ({filtered.length})</AdminCardHeader>
          <AdminCardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No leads found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filtered.map((lead, index) => {
                  const SourceIcon = sourceIcons[lead.lead_source] || Globe;
                  const stCfg = statusConfig[lead.lead_status] || statusConfig.new;
                  return (
                    <motion.div key={lead.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      whileHover={{ x: 4 }}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                        selectedLead?.id === lead.id ? "border-accent bg-accent/5 shadow-lg" : "border-border hover:border-accent/50"
                      )}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-light text-white flex items-center justify-center font-bold flex-shrink-0">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{lead.name}</h3>
                            <p className="text-sm text-muted-foreground truncate">{lead.company || lead.email}</p>
                          </div>
                        </div>
                        <Badge className={cn("flex-shrink-0 font-semibold border-0", stCfg.color)}>
                          {stCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={cn("gap-1 border-0 text-xs", sourceColors[lead.lead_source] || "bg-muted text-foreground")}>
                          <SourceIcon className="h-3 w-3" />
                          {lead.lead_source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AdminCardContent>
        </AdminCard>

        {/* Lead Detail */}
        <AdminCard gradient>
          <AnimatePresence mode="wait">
            {selectedLead ? (
              <motion.div key={selectedLead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <motion.h2 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="font-display font-bold text-xl text-foreground">
                      {selectedLead.name}
                    </motion.h2>
                    <p className="text-sm text-muted-foreground">
                      Lead since {format(new Date(selectedLead.created_at), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setSelectedLead(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Contact Info */}
                <div className="space-y-3 mb-6">
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 group hover:bg-accent/10 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-colors">
                      <Mail className="h-5 w-5 text-accent group-hover:text-white transition-colors" />
                    </div>
                    <a href={`mailto:${selectedLead.email}`} className="text-accent hover:underline font-medium text-sm">{selectedLead.email}</a>
                  </motion.div>
                  {selectedLead.phone && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 group hover:bg-accent/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-colors">
                        <Phone className="h-5 w-5 text-accent group-hover:text-white transition-colors" />
                      </div>
                      <a href={`tel:${selectedLead.phone}`} className="text-accent hover:underline font-medium text-sm">{selectedLead.phone}</a>
                    </motion.div>
                  )}
                  {selectedLead.company && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Building className="h-5 w-5 text-accent" />
                      </div>
                      <span className="font-medium text-sm">{selectedLead.company}</span>
                    </motion.div>
                  )}
                  {selectedLead.product_name && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-accent" />
                      </div>
                      <span className="font-medium text-sm">{selectedLead.product_name}</span>
                    </motion.div>
                  )}
                  {selectedLead.expected_value && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <IndianRupee className="h-5 w-5 text-accent" />
                      </div>
                      <span className="font-bold text-emerald-600 text-sm">{inr(Number(selectedLead.expected_value))}</span>
                    </motion.div>
                  )}
                </div>

                {/* Message */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Message</h3>
                  <div className="p-4 bg-muted rounded-xl mb-6">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedLead.message}</p>
                  </div>
                </motion.div>

                {/* Pipeline & Follow-up Info */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground font-medium w-28">Pipeline Stage:</span>
                    <Badge className="bg-accent/10 text-accent border-0 font-semibold">
                      {(pipelineStages.find((s) => s.id === selectedLead.pipeline_stage)?.label) || selectedLead.pipeline_stage}
                    </Badge>
                  </div>
                  {selectedLead.next_followup_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground font-medium w-28">Next Follow-up:</span>
                      <span className="font-medium">{format(new Date(selectedLead.next_followup_at), "MMM d, yyyy 'at' h:mm a")}</span>
                    </div>
                  )}
                </motion.div>

                {/* Actions */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                  className="flex flex-wrap gap-3">
                  <Select value={selectedLead.lead_status} onValueChange={(v) => updateLeadStatus(selectedLead.id, v)}>
                    <SelectTrigger className={cn("h-9 w-40 rounded-lg border-0 text-xs font-semibold", (statusConfig[selectedLead.lead_status] || statusConfig.new).color)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedLead.lead_source} onValueChange={(v) => updateLeadSource(selectedLead.id, v)}>
                    <SelectTrigger className="h-9 w-36 rounded-lg border text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="reference">Reference</SelectItem>
                      <SelectItem value="ads">Ads</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="accent" size="sm" asChild className="rounded-xl">
                    <a href={`mailto:${selectedLead.email}`}><Mail className="mr-2 h-4 w-4" />Reply</a>
                  </Button>
                  {selectedLead.phone && (
                    <Button variant="outline" size="sm" asChild className="rounded-xl">
                      <a href={`tel:${selectedLead.phone}`}><Phone className="mr-2 h-4 w-4" />Call</a>
                    </Button>
                  )}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Eye className="h-10 w-10" />
                </div>
                <p className="font-medium text-lg">Select a lead</p>
                <p className="text-sm">to view full details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </AdminCard>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   2. FOLLOW-UP MANAGEMENT
   ══════════════════════════════════════════════════ */
function FollowUpManagement({
  enquiries, followUps, setFollowUps,
}: {
  enquiries: Enquiry[];
  followUps: FollowUp[];
  setFollowUps: React.Dispatch<React.SetStateAction<FollowUp[]>>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newFu, setNewFu] = useState({ enquiry_id: "", follow_up_type: "call", notes: "", scheduled_at: "" });
  const [saving, setSaving] = useState(false);

  const enquiryMap = useMemo(() => {
    const m = new Map<string, Enquiry>();
    enquiries.forEach((e) => m.set(e.id, e));
    return m;
  }, [enquiries]);

  const todayFollowUps = followUps.filter((f) => !f.completed && f.scheduled_at && isToday(new Date(f.scheduled_at)));
  const overdueFollowUps = followUps.filter((f) => !f.completed && f.scheduled_at && isPast(new Date(f.scheduled_at)) && !isToday(new Date(f.scheduled_at)));
  const upcomingFollowUps = followUps.filter((f) => !f.completed && f.scheduled_at && !isPast(new Date(f.scheduled_at)) && !isToday(new Date(f.scheduled_at)));
  const completedFollowUps = followUps.filter((f) => f.completed);

  const addFollowUp = async () => {
    if (!newFu.enquiry_id || !newFu.scheduled_at) return;
    setSaving(true);
    const { data, error } = await supabase.from("follow_ups").insert({
      enquiry_id: newFu.enquiry_id,
      follow_up_type: newFu.follow_up_type,
      notes: newFu.notes || null,
      scheduled_at: new Date(newFu.scheduled_at).toISOString(),
    }).select().single();
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setFollowUps((prev) => [...prev, data as FollowUp]);
    setNewFu({ enquiry_id: "", follow_up_type: "call", notes: "", scheduled_at: "" });
    setShowAdd(false);
    toast({ title: "Follow-up scheduled" });
  };

  const toggleComplete = async (fu: FollowUp) => {
    const completed = !fu.completed;
    const completed_at = completed ? new Date().toISOString() : null;
    setFollowUps((prev) => prev.map((f) => f.id === fu.id ? { ...f, completed, completed_at } : f));
    const { error } = await supabase.from("follow_ups").update({ completed, completed_at }).eq("id", fu.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const typeIcons: Record<string, any> = { call: PhoneCall, meeting: Users, email: Mail, whatsapp: MessageCircle };

  const renderFollowUp = (fu: FollowUp) => {
    const enq = enquiryMap.get(fu.enquiry_id);
    const TypeIcon = typeIcons[fu.follow_up_type] || PhoneCall;
    const isOverdue = !fu.completed && fu.scheduled_at && isPast(new Date(fu.scheduled_at)) && !isToday(new Date(fu.scheduled_at));
    return (
      <motion.div key={fu.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        className={cn("flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
          fu.completed ? "border-border bg-muted/30 opacity-60" : isOverdue ? "border-rose-300 bg-rose-50/50" : "border-border bg-card hover:border-accent/30"
        )}
      >
        <button onClick={() => toggleComplete(fu)}
          className={cn("w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors",
            fu.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30 hover:border-accent"
          )}
        >
          {fu.completed && <CheckCircle2 className="h-4 w-4" />}
        </button>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          fu.follow_up_type === "call" ? "bg-blue-100 text-blue-600" :
          fu.follow_up_type === "meeting" ? "bg-purple-100 text-purple-600" :
          fu.follow_up_type === "email" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
        )}>
          <TypeIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{enq?.name || "Unknown Lead"}</div>
          {fu.notes && <div className="text-xs text-muted-foreground truncate mt-0.5">{fu.notes}</div>}
        </div>
        <div className="text-right flex-shrink-0">
          {fu.scheduled_at && (
            <div className={cn("text-xs font-medium", isOverdue ? "text-rose-600" : "text-muted-foreground")}>
              {isOverdue && <AlertCircle className="h-3 w-3 inline mr-1" />}
              {format(new Date(fu.scheduled_at), "MMM d, h:mm a")}
            </div>
          )}
          <Badge variant="outline" className="text-xs mt-1 capitalize">{fu.follow_up_type}</Badge>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={AlertCircle} label="Overdue" value={overdueFollowUps.length} color="text-rose-600 bg-rose-100" />
        <StatBox icon={Clock} label="Today" value={todayFollowUps.length} color="text-amber-600 bg-amber-100" />
        <StatBox icon={CalendarCheck} label="Upcoming" value={upcomingFollowUps.length} color="text-blue-600 bg-blue-100" />
        <StatBox icon={CheckCircle2} label="Completed" value={completedFollowUps.length} color="text-emerald-600 bg-emerald-100" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(!showAdd)} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Schedule Follow-Up
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="p-5 rounded-2xl border-2 border-accent/30 bg-card space-y-4 overflow-hidden"
          >
            <h3 className="font-semibold">New Follow-Up</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={newFu.enquiry_id} onValueChange={(v) => setNewFu({ ...newFu, enquiry_id: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Lead" /></SelectTrigger>
                <SelectContent>
                  {enquiries.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} – {e.company || e.email}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={newFu.follow_up_type} onValueChange={(v) => setNewFu({ ...newFu, follow_up_type: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
              <Input type="datetime-local" value={newFu.scheduled_at} onChange={(e) => setNewFu({ ...newFu, scheduled_at: e.target.value })} className="rounded-xl" />
              <Input placeholder="Notes (optional)" value={newFu.notes} onChange={(e) => setNewFu({ ...newFu, notes: e.target.value })} className="rounded-xl" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={addFollowUp} disabled={saving || !newFu.enquiry_id || !newFu.scheduled_at} className="rounded-xl">Save</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sections */}
      {overdueFollowUps.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-rose-600 mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Overdue ({overdueFollowUps.length})</h3>
          <div className="space-y-2">{overdueFollowUps.map(renderFollowUp)}</div>
        </div>
      )}
      {todayFollowUps.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-amber-600 mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> Today ({todayFollowUps.length})</h3>
          <div className="space-y-2">{todayFollowUps.map(renderFollowUp)}</div>
        </div>
      )}
      {upcomingFollowUps.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> Upcoming ({upcomingFollowUps.length})</h3>
          <div className="space-y-2">{upcomingFollowUps.map(renderFollowUp)}</div>
        </div>
      )}
      {completedFollowUps.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-emerald-600 mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Completed ({completedFollowUps.length})</h3>
          <div className="space-y-2">{completedFollowUps.slice(0, 10).map(renderFollowUp)}</div>
        </div>
      )}
      {followUps.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No follow-ups yet</p>
          <p className="text-sm">Schedule your first follow-up to start tracking</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   3. SALES PIPELINE
   ══════════════════════════════════════════════════ */
function SalesPipeline({ enquiries, setEnquiries }: { enquiries: Enquiry[]; setEnquiries: React.Dispatch<React.SetStateAction<Enquiry[]>> }) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const moveLead = async (id: string, stage: string) => {
    const prev = enquiries;
    setEnquiries((p) => p.map((l) => l.id === id ? { ...l, pipeline_stage: stage } : l));
    const { error } = await supabase.from("enquiries").update({ pipeline_stage: stage }).eq("id", id);
    if (error) { setEnquiries(prev); toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  // Stats
  const totalPipeline = enquiries.filter((e) => !["won", "lost"].includes(e.pipeline_stage)).reduce((s, e) => s + Number(e.expected_value || 0), 0);
  const wonValue = enquiries.filter((e) => e.pipeline_stage === "won").reduce((s, e) => s + Number(e.expected_value || 0), 0);
  const conversionRate = enquiries.length > 0 ? Math.round((enquiries.filter((e) => e.pipeline_stage === "won").length / enquiries.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border-2 border-border bg-card">
          <div className="text-sm text-muted-foreground mb-1">Active Pipeline</div>
          <div className="text-2xl font-bold text-accent">{inr(totalPipeline)}</div>
        </div>
        <div className="p-5 rounded-2xl border-2 border-border bg-card">
          <div className="text-sm text-muted-foreground mb-1">Won Revenue</div>
          <div className="text-2xl font-bold text-emerald-600">{inr(wonValue)}</div>
        </div>
        <div className="p-5 rounded-2xl border-2 border-border bg-card">
          <div className="text-sm text-muted-foreground mb-1">Conversion Rate</div>
          <div className="text-2xl font-bold">{conversionRate}%</div>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {pipelineStages.map((stage) => {
          const stageLeads = enquiries.filter((e) => e.pipeline_stage === stage.id);
          const stageVal = stageLeads.reduce((s, e) => s + Number(e.expected_value || 0), 0);
          return (
            <div key={stage.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (draggedId) moveLead(draggedId, stage.id); setDraggedId(null); }}
              className="bg-muted/30 rounded-2xl p-3 min-h-[350px]"
            >
              <div className={cn("rounded-xl px-3 py-2 mb-3 bg-gradient-to-r text-white shadow-sm", stage.color)}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{stage.label}</span>
                  <Badge className="bg-white/20 text-white border-0">{stageLeads.length}</Badge>
                </div>
                {stageVal > 0 && <div className="text-xs opacity-90 mt-0.5">{inr(stageVal)}</div>}
              </div>
              <div className="space-y-2">
                {stageLeads.map((l) => (
                  <motion.div key={l.id} layout draggable onDragStart={() => setDraggedId(l.id)}
                    whileHover={{ scale: 1.02 }}
                    className="bg-card rounded-xl p-3 shadow-sm border border-border cursor-grab active:cursor-grabbing"
                  >
                    <div className="font-semibold text-sm truncate">{l.name}</div>
                    {l.company && <div className="text-xs text-muted-foreground truncate">{l.company}</div>}
                    {l.product_name && <div className="text-xs text-accent font-medium mt-1 truncate">{l.product_name}</div>}
                    {l.expected_value && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
                        <IndianRupee className="h-3 w-3" /> {inr(Number(l.expected_value))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">{format(new Date(l.created_at), "MMM d")}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Drag a lead card onto a different stage: Enquiry → Quotation → Negotiation → Order</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   4. CUSTOMER DATABASE
   ══════════════════════════════════════════════════ */
function CustomerDatabase({ profiles, orders }: { profiles: ProfileRow[]; orders: OrderRow[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProfileRow | null>(null);

  const customerStats = useMemo(() => {
    const map = new Map<string, { ltv: number; orderCount: number }>();
    profiles.forEach((p) => map.set(p.user_id, { ltv: 0, orderCount: 0 }));
    orders.forEach((o) => {
      const s = map.get(o.user_id);
      if (s) { s.ltv += Number(o.total_amount || 0); s.orderCount += 1; }
    });
    return map;
  }, [profiles, orders]);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return !q || (p.full_name || "").toLowerCase().includes(q) || (p.phone || "").includes(q) || (p.company || "").toLowerCase().includes(q) || (p.city || "").toLowerCase().includes(q);
  });

  const selectedOrders = selected ? orders.filter((o) => o.user_id === selected.user_id) : [];
  const totalLTV = Array.from(customerStats.values()).reduce((s, c) => s + c.ltv, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border-2 border-border bg-card">
          <div className="text-sm text-muted-foreground mb-1">Total Customers</div>
          <div className="text-2xl font-bold">{profiles.length}</div>
        </div>
        <div className="p-5 rounded-2xl border-2 border-border bg-card">
          <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-accent">{inr(totalLTV)}</div>
        </div>
        <div className="p-5 rounded-2xl border-2 border-border bg-card">
          <div className="text-sm text-muted-foreground mb-1">Total Orders</div>
          <div className="text-2xl font-bold">{orders.length}</div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Search by name, phone, company, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11 h-11 rounded-xl border-2" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* List */}
        <AdminCard delay={0.1}>
          <AdminCardHeader>Customer Directory ({filtered.length})</AdminCardHeader>
          <AdminCardContent>
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-2">
              {filtered.map((p) => {
                const stats = customerStats.get(p.user_id) || { ltv: 0, orderCount: 0 };
                return (
                  <motion.button key={p.id} whileHover={{ x: 4 }} onClick={() => setSelected(p)}
                    className={cn("w-full text-left border-2 rounded-xl p-3 transition-all",
                      selected?.id === p.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-light text-white flex items-center justify-center font-bold flex-shrink-0">
                          {(p.full_name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{p.full_name || "Unnamed"}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.company || p.city || "—"}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-accent">{inr(stats.ltv)}</div>
                        <div className="text-xs text-muted-foreground">{stats.orderCount} orders</div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </AdminCardContent>
        </AdminCard>

        {/* Detail */}
        <AdminCard delay={0.2} gradient>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
                <h2 className="font-display font-bold text-xl mb-1">{selected.full_name || "Unnamed Customer"}</h2>
                <p className="text-sm text-muted-foreground mb-5">Since {format(new Date(selected.created_at), "MMM d, yyyy")}</p>

                <div className="space-y-3 mb-6">
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center"><Phone className="h-4 w-4 text-accent" /></div>
                      <span className="text-sm font-medium">{selected.phone}</span>
                    </a>
                  )}
                  {selected.company && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center"><Building className="h-4 w-4 text-accent" /></div>
                      <span className="text-sm font-medium">{selected.company}</span>
                    </div>
                  )}
                  {selected.city && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center"><MapPin className="h-4 w-4 text-accent" /></div>
                      <span className="text-sm font-medium">{[selected.city, selected.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4" /> Order History</h3>
                {selectedOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                        <div>
                          <div className="font-medium text-sm">{o.order_number}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">{inr(Number(o.total_amount || 0))}</div>
                          <Badge variant="outline" className="text-xs">{o.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Select a customer to view details</p>
              </div>
            )}
          </AnimatePresence>
        </AdminCard>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl border-2 border-border bg-card"
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   7. TASK & REMINDER
   ══════════════════════════════════════════════════ */
function TaskReminder({ tasks, setTasks, enquiries }: { tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; enquiries: Enquiry[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", due_date: "", priority: "medium", status: "pending", related_enquiry_id: "" });
  const [filterStatus, setFilterStatus] = useState("all");

  const priorityColors: Record<string, string> = { high: "bg-rose-100 text-rose-700", medium: "bg-amber-100 text-amber-700", low: "bg-blue-100 text-blue-700" };
  const statusColors: Record<string, string> = { pending: "bg-gray-100 text-gray-700", in_progress: "bg-blue-100 text-blue-700", completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-rose-100 text-rose-700" };

  const overdueTasks = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== "completed" && t.status !== "cancelled");
  const todayTasks = tasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const tomorrowTasks = tasks.filter(t => t.due_date && isTomorrow(new Date(t.due_date)));

  const filtered = filterStatus === "all" ? tasks : tasks.filter(t => t.status === filterStatus);

  const resetForm = () => { setForm({ title: "", description: "", assigned_to: "", due_date: "", priority: "medium", status: "pending", related_enquiry_id: "" }); setEditId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    try {
      const payload = { title: form.title, description: form.description || null, assigned_to: form.assigned_to || null, due_date: form.due_date || null, priority: form.priority, status: form.status, related_enquiry_id: form.related_enquiry_id || null };
      if (editId) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editId);
        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === editId ? { ...t, ...payload, updated_at: new Date().toISOString() } : t));
        toast({ title: "Task updated" });
      } else {
        const { data, error } = await supabase.from("tasks").insert(payload).select().single();
        if (error) throw error;
        setTasks(prev => [data as Task, ...prev]);
        toast({ title: "Task created" });
      }
      resetForm();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
    toast({ title: "Task deleted" });
  };

  const handleEdit = (task: Task) => {
    setForm({ title: task.title, description: task.description || "", assigned_to: task.assigned_to || "", due_date: task.due_date || "", priority: task.priority, status: task.status, related_enquiry_id: task.related_enquiry_id || "" });
    setEditId(task.id);
    setShowForm(true);
  };

  const toggleComplete = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
    if (error) return;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="space-y-6">
      {/* Reminder banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatBox icon={AlertCircle} label="Overdue Tasks" value={overdueTasks.length} color="bg-rose-100 text-rose-700" />
        <StatBox icon={Clock} label="Due Today" value={todayTasks.length} color="bg-amber-100 text-amber-700" />
        <StatBox icon={Bell} label="Due Tomorrow" value={tomorrowTasks.length} color="bg-blue-100 text-blue-700" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Task</Button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <AdminCard>
              <AdminCardHeader>
                <h3 className="font-semibold">{editId ? "Edit Task" : "Create Task"}</h3>
              </AdminCardHeader>
              <AdminCardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Task title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  <Input placeholder="Assign to (team member)" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  {enquiries.length > 0 && (
                    <Select value={form.related_enquiry_id} onValueChange={v => setForm(f => ({ ...f, related_enquiry_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Link to enquiry (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {enquiries.slice(0, 20).map(e => <SelectItem key={e.id} value={e.id}>{e.name} – {e.product_name || "General"}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Textarea placeholder="Description / notes" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                <div className="flex gap-3">
                  <Button onClick={handleSave}>{editId ? "Update" : "Create"} Task</Button>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </AdminCardContent>
            </AdminCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground"><ListTodo className="h-12 w-12 mx-auto mb-3 opacity-40" /><p>No tasks found</p></div>
        ) : filtered.map(task => {
          const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed" && task.status !== "cancelled";
          return (
            <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={cn("p-4 rounded-xl border-2 bg-card", isOverdue ? "border-rose-300" : "border-border")}
            >
              <div className="flex items-start gap-3">
                <button onClick={() => toggleComplete(task)} className={cn("mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors", task.status === "completed" ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 hover:border-accent")}>
                  {task.status === "completed" && <CheckCircle2 className="h-3 w-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("font-semibold", task.status === "completed" && "line-through text-muted-foreground")}>{task.title}</span>
                    <Badge className={cn("text-xs", priorityColors[task.priority])}>{task.priority}</Badge>
                    <Badge className={cn("text-xs", statusColors[task.status])}>{task.status.replace("_", " ")}</Badge>
                    {isOverdue && <Badge className="text-xs bg-rose-100 text-rose-700">Overdue</Badge>}
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {task.assigned_to && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{task.assigned_to}</span>}
                    {task.due_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(task.due_date), "dd MMM yyyy")}</span>}
                    <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{format(new Date(task.created_at), "dd MMM")}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(task)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDelete(task.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   8. SERVICE & SUPPORT
   ══════════════════════════════════════════════════ */
function ServiceSupport({ serviceRequests, setServiceRequests }: { serviceRequests: ServiceRequest[]; setServiceRequests: React.Dispatch<React.SetStateAction<ServiceRequest[]>> }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", request_type: "service", subject: "", description: "", status: "open", priority: "medium", resolution_notes: "" });

  const typeLabels: Record<string, { label: string; icon: any; color: string }> = {
    complaint: { label: "Complaint", icon: ShieldAlert, color: "bg-rose-100 text-rose-700" },
    service: { label: "Service Request", icon: Wrench, color: "bg-blue-100 text-blue-700" },
    after_sales: { label: "After-Sales", icon: Headphones, color: "bg-purple-100 text-purple-700" },
  };
  const statusColors: Record<string, string> = { open: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700", resolved: "bg-emerald-100 text-emerald-700", closed: "bg-gray-100 text-gray-700" };

  const openCount = serviceRequests.filter(r => r.status === "open").length;
  const inProgressCount = serviceRequests.filter(r => r.status === "in_progress").length;
  const resolvedCount = serviceRequests.filter(r => r.status === "resolved" || r.status === "closed").length;

  const resetForm = () => { setForm({ customer_name: "", customer_email: "", customer_phone: "", request_type: "service", subject: "", description: "", status: "open", priority: "medium", resolution_notes: "" }); setEditId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.customer_name.trim() || !form.subject.trim()) { toast({ title: "Name & subject required", variant: "destructive" }); return; }
    try {
      const payload = { customer_name: form.customer_name, customer_email: form.customer_email || null, customer_phone: form.customer_phone || null, request_type: form.request_type, subject: form.subject, description: form.description || null, status: form.status, priority: form.priority, resolution_notes: form.resolution_notes || null, resolved_at: form.status === "resolved" ? new Date().toISOString() : null };
      if (editId) {
        const { error } = await supabase.from("service_requests").update(payload).eq("id", editId);
        if (error) throw error;
        setServiceRequests(prev => prev.map(r => r.id === editId ? { ...r, ...payload, updated_at: new Date().toISOString() } : r));
        toast({ title: "Request updated" });
      } else {
        const { data, error } = await supabase.from("service_requests").insert(payload).select().single();
        if (error) throw error;
        setServiceRequests(prev => [data as ServiceRequest, ...prev]);
        toast({ title: "Request created" });
      }
      resetForm();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("service_requests").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setServiceRequests(prev => prev.filter(r => r.id !== id));
    toast({ title: "Request deleted" });
  };

  const handleEdit = (r: ServiceRequest) => {
    setForm({ customer_name: r.customer_name, customer_email: r.customer_email || "", customer_phone: r.customer_phone || "", request_type: r.request_type, subject: r.subject, description: r.description || "", status: r.status, priority: r.priority, resolution_notes: r.resolution_notes || "" });
    setEditId(r.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatBox icon={AlertCircle} label="Open Requests" value={openCount} color="bg-blue-100 text-blue-700" />
        <StatBox icon={Clock} label="In Progress" value={inProgressCount} color="bg-amber-100 text-amber-700" />
        <StatBox icon={CheckCircle2} label="Resolved" value={resolvedCount} color="bg-emerald-100 text-emerald-700" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <AdminCard>
              <AdminCardHeader><h3 className="font-semibold">{editId ? "Edit Request" : "New Service Request"}</h3></AdminCardHeader>
              <AdminCardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Customer name *" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
                  <Input placeholder="Email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} />
                  <Input placeholder="Phone" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
                  <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="service">Service Request</SelectItem>
                      <SelectItem value="after_sales">After-Sales Support</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Subject *" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                <Textarea placeholder="Resolution notes" value={form.resolution_notes} onChange={e => setForm(f => ({ ...f, resolution_notes: e.target.value }))} rows={2} />
                <div className="flex gap-3">
                  <Button onClick={handleSave}>{editId ? "Update" : "Create"}</Button>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </AdminCardContent>
            </AdminCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {serviceRequests.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground"><Headphones className="h-12 w-12 mx-auto mb-3 opacity-40" /><p>No service requests</p></div>
        ) : serviceRequests.map(r => {
          const typeInfo = typeLabels[r.request_type] || typeLabels.service;
          const TypeIcon = typeInfo.icon;
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border-2 border-border bg-card"
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", typeInfo.color)}>
                  <TypeIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.subject}</span>
                    <Badge className={cn("text-xs", typeInfo.color)}>{typeInfo.label}</Badge>
                    <Badge className={cn("text-xs", statusColors[r.status])}>{r.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{r.customer_name}{r.customer_phone ? ` · ${r.customer_phone}` : ""}{r.customer_email ? ` · ${r.customer_email}` : ""}</p>
                  {r.description && <p className="text-sm mt-1">{r.description}</p>}
                  {r.resolution_notes && <p className="text-sm text-emerald-600 mt-1">✅ {r.resolution_notes}</p>}
                  <div className="text-xs text-muted-foreground mt-2">{format(new Date(r.created_at), "dd MMM yyyy, hh:mm a")}</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   9. REPORTS & ANALYTICS
   ══════════════════════════════════════════════════ */
function ReportsAnalytics({ enquiries, orders, tasks, serviceRequests, profiles }: {
  enquiries: Enquiry[]; orders: OrderRow[]; tasks: Task[]; serviceRequests: ServiceRequest[]; profiles: ProfileRow[];
}) {
  const totalLeads = enquiries.length;
  const convertedLeads = enquiries.filter(e => e.lead_status === "converted" || e.pipeline_stage === "won").length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0";

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const completedOrders = orders.filter(o => o.status === "delivered" || o.status === "completed").length;

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const taskCompletionRate = tasks.length > 0 ? ((completedTasks / tasks.length) * 100).toFixed(1) : "0";

  const resolvedRequests = serviceRequests.filter(r => r.status === "resolved" || r.status === "closed").length;
  const resolutionRate = serviceRequests.length > 0 ? ((resolvedRequests / serviceRequests.length) * 100).toFixed(1) : "0";

  // Lead source breakdown
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    enquiries.forEach(e => { map[e.lead_source] = (map[e.lead_source] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [enquiries]);

  // Monthly lead trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: Record<string, number> = {};
    enquiries.forEach(e => {
      const m = format(new Date(e.created_at), "MMM yyyy");
      months[m] = (months[m] || 0) + 1;
    });
    return Object.entries(months).slice(0, 6);
  }, [enquiries]);

  // Pipeline stage breakdown
  const pipelineBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    enquiries.forEach(e => { map[e.pipeline_stage] = (map[e.pipeline_stage] || 0) + 1; });
    return Object.entries(map);
  }, [enquiries]);

  const stageLabels: Record<string, string> = { new: "Enquiry", qualified: "Quotation", proposal: "Negotiation", won: "Order" };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl border-2 border-border bg-gradient-to-br from-blue-50 to-white">
          <div className="text-xs text-muted-foreground font-semibold uppercase">Lead Conversion</div>
          <div className="text-3xl font-bold mt-1">{conversionRate}%</div>
          <div className="text-xs text-muted-foreground">{convertedLeads} of {totalLeads} leads</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-5 rounded-2xl border-2 border-border bg-gradient-to-br from-emerald-50 to-white">
          <div className="text-xs text-muted-foreground font-semibold uppercase">Total Revenue</div>
          <div className="text-3xl font-bold mt-1">{inr(totalRevenue)}</div>
          <div className="text-xs text-muted-foreground">{completedOrders} completed orders</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-5 rounded-2xl border-2 border-border bg-gradient-to-br from-amber-50 to-white">
          <div className="text-xs text-muted-foreground font-semibold uppercase">Task Completion</div>
          <div className="text-3xl font-bold mt-1">{taskCompletionRate}%</div>
          <div className="text-xs text-muted-foreground">{completedTasks} of {tasks.length} tasks</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-5 rounded-2xl border-2 border-border bg-gradient-to-br from-purple-50 to-white">
          <div className="text-xs text-muted-foreground font-semibold uppercase">Support Resolution</div>
          <div className="text-3xl font-bold mt-1">{resolutionRate}%</div>
          <div className="text-xs text-muted-foreground">{resolvedRequests} of {serviceRequests.length} requests</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Conversion Report */}
        <AdminCard>
          <AdminCardHeader><h3 className="font-semibold flex items-center gap-2"><FileBarChart className="h-5 w-5 text-accent" /> Lead Conversion Report</h3></AdminCardHeader>
          <AdminCardContent>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">By Source</h4>
              {sourceBreakdown.map(([source, count]) => {
                const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                return (
                  <div key={source} className="space-y-1">
                    <div className="flex justify-between text-sm"><span className="capitalize">{source}</span><span className="font-semibold">{count} ({pct.toFixed(0)}%)</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-accent to-amber-light rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Pipeline Distribution</h4>
                {pipelineBreakdown.map(([stage, count]) => (
                  <div key={stage} className="flex justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                    <span>{stageLabels[stage] || stage}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </AdminCardContent>
        </AdminCard>

        {/* Sales Performance */}
        <AdminCard>
          <AdminCardHeader><h3 className="font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-accent" /> Sales Performance</h3></AdminCardHeader>
          <AdminCardContent>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Monthly Lead Trend</h4>
              {monthlyTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : monthlyTrend.map(([month, count]) => {
                const max = Math.max(...monthlyTrend.map(([, c]) => c));
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={month} className="space-y-1">
                    <div className="flex justify-between text-sm"><span>{month}</span><span className="font-semibold">{count} leads</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
              <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/50">
                  <div className="text-xs text-muted-foreground">Total Customers</div>
                  <div className="text-2xl font-bold">{profiles.length}</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <div className="text-xs text-muted-foreground">Total Orders</div>
                  <div className="text-2xl font-bold">{orders.length}</div>
                </div>
              </div>
            </div>
          </AdminCardContent>
        </AdminCard>

        {/* Team Productivity */}
        <AdminCard className="lg:col-span-2">
          <AdminCardHeader><h3 className="font-semibold flex items-center gap-2"><Activity className="h-5 w-5 text-accent" /> Team Productivity</h3></AdminCardHeader>
          <AdminCardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <div className="text-3xl font-bold">{tasks.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Tasks</div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <div className="text-3xl font-bold">{completedTasks}</div>
                <div className="text-xs text-muted-foreground mt-1">Completed</div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <div className="text-3xl font-bold">{tasks.filter(t => t.status === "in_progress").length}</div>
                <div className="text-xs text-muted-foreground mt-1">In Progress</div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <div className="text-3xl font-bold">{tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== "completed").length}</div>
                <div className="text-xs text-muted-foreground mt-1">Overdue</div>
              </div>
            </div>
            {/* Team member breakdown */}
            {(() => {
              const members: Record<string, { total: number; done: number }> = {};
              tasks.forEach(t => {
                const name = t.assigned_to || "Unassigned";
                if (!members[name]) members[name] = { total: 0, done: 0 };
                members[name].total++;
                if (t.status === "completed") members[name].done++;
              });
              const entries = Object.entries(members).sort((a, b) => b[1].total - a[1].total);
              if (entries.length === 0) return null;
              return (
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">By Team Member</h4>
                  {entries.map(([name, { total, done }]) => (
                    <div key={name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0"><span className="text-xs font-bold text-accent">{name[0]?.toUpperCase()}</span></div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm"><span>{name}</span><span className="text-muted-foreground">{done}/{total} done</span></div>
                        <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </AdminCardContent>
        </AdminCard>
      </div>
    </div>
  );
}
