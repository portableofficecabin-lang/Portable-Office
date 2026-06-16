"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Loader2, Mail, Phone, IndianRupee, Calendar as CalIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Lead {
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
  created_at: string;
}

const stages = [
  { id: "new", label: "New", color: "from-blue-500 to-blue-400" },
  { id: "contacted", label: "Contacted", color: "from-indigo-500 to-indigo-400" },
  { id: "qualified", label: "Qualified", color: "from-purple-500 to-purple-400" },
  { id: "proposal", label: "Proposal", color: "from-amber-500 to-amber-400" },
  { id: "won", label: "Won", color: "from-emerald-500 to-emerald-400" },
  { id: "lost", label: "Lost", color: "from-rose-500 to-rose-400" },
];

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function AdminLeadsPipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
    const channel = supabase
      .channel("leads-pipeline")
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, fetchLeads)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("enquiries")
      .select("id,name,email,phone,company,product_name,message,pipeline_stage,expected_value,next_followup_at,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setLeads((data as Lead[]) || []);
    }
    setIsLoading(false);
  };

  const moveLead = async (id: string, stage: string) => {
    const prev = leads;
    setLeads((p) => p.map((l) => (l.id === id ? { ...l, pipeline_stage: stage } : l)));
    const { error } = await supabase.from("enquiries").update({ pipeline_stage: stage }).eq("id", id);
    if (error) {
      setLeads(prev);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>;
  }

  const totalValue = leads
    .filter((l) => !["lost", "won"].includes(l.pipeline_stage))
    .reduce((s, l) => s + Number(l.expected_value || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads Pipeline"
        description="Drag leads across stages — New → Contacted → Qualified → Proposal → Won/Lost"
        badge={
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent to-amber-light text-white text-sm font-semibold">
            Pipeline value: {inr(totalValue)}
          </span>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.pipeline_stage === stage.id);
          const stageValue = stageLeads.reduce((s, l) => s + Number(l.expected_value || 0), 0);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (draggedId) moveLead(draggedId, stage.id); setDraggedId(null); }}
              className="bg-muted/30 rounded-2xl p-3 min-h-[400px]"
            >
              <div className={cn("rounded-xl px-3 py-2 mb-3 bg-gradient-to-r text-white shadow-sm", stage.color)}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{stage.label}</span>
                  <Badge className="bg-white/20 text-white border-0">{stageLeads.length}</Badge>
                </div>
                {stageValue > 0 && <div className="text-xs opacity-90 mt-0.5">{inr(stageValue)}</div>}
              </div>
              <div className="space-y-2">
                {stageLeads.map((l) => (
                  <motion.div
                    key={l.id}
                    layout
                    draggable
                    onDragStart={() => setDraggedId(l.id)}
                    whileHover={{ scale: 1.02 }}
                    className="bg-card rounded-xl p-3 shadow-sm border border-border cursor-grab active:cursor-grabbing"
                  >
                    <div className="font-semibold text-sm truncate">{l.name}</div>
                    {l.company && <div className="text-xs text-muted-foreground truncate">{l.company}</div>}
                    {l.product_name && (
                      <div className="text-xs text-accent font-medium mt-1 truncate">{l.product_name}</div>
                    )}
                    {l.expected_value && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
                        <IndianRupee className="h-3 w-3" /> {inr(Number(l.expected_value))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                      {l.email && <a href={`mailto:${l.email}`} className="text-muted-foreground hover:text-accent"><Mail className="h-3.5 w-3.5" /></a>}
                      {l.phone && <a href={`tel:${l.phone}`} className="text-muted-foreground hover:text-accent"><Phone className="h-3.5 w-3.5" /></a>}
                      <span className="text-xs text-muted-foreground ml-auto">{format(new Date(l.created_at), "MMM d")}</span>
                    </div>
                    {l.next_followup_at && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <CalIcon className="h-3 w-3" /> {format(new Date(l.next_followup_at), "MMM d")}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">Tip: drag a lead card onto a different stage to move it. Changes save instantly.</p>
    </div>
  );
}
