"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Truck, Mail, Phone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardContent } from "@/components/admin/AdminCard";

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  gst_number: string | null;
  lead_time_days: number | null;
  notes: string | null;
}

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_person: "", email: "", phone: "", address: "", gst_number: "", lead_time_days: 7, notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    const { data, error } = await supabase.from("suppliers").select("*").order("name");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setSuppliers((data as Supplier[]) || []);
    setIsLoading(false);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("suppliers").insert({ ...form, lead_time_days: Number(form.lead_time_days) || 7 }).select().single();
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSuppliers((p) => [data as Supplier, ...p]);
    setOpen(false);
    setForm({ name: "", contact_person: "", email: "", phone: "", address: "", gst_number: "", lead_time_days: 7, notes: "" });
    toast({ title: "Supplier added" });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSuppliers((p) => p.filter((s) => s.id !== id));
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier directory and lead times"
        badge={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Supplier</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                  <div><Label>Lead Time (days)</Label><Input type="number" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div><Label>GST Number</Label><Input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} /></div>
                <div><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={submit} disabled={saving || !form.name.trim()} className="w-full">Save Supplier</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {suppliers.length === 0 ? (
        <AdminCard><AdminCardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No suppliers yet. Add your first one.</p>
          </div>
        </AdminCardContent></AdminCard>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-amber-light text-white flex items-center justify-center"><Truck className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    {s.contact_person && <p className="text-xs text-muted-foreground">{s.contact_person}</p>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-rose-500 hover:text-rose-600"><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1.5 text-sm">
                {s.email && <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-accent"><Mail className="h-3.5 w-3.5" /> {s.email}</a>}
                {s.phone && <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-accent"><Phone className="h-3.5 w-3.5" /> {s.phone}</a>}
                {s.gst_number && <p className="text-xs text-muted-foreground">GST: <span className="font-mono">{s.gst_number}</span></p>}
                <p className="text-xs"><span className="text-muted-foreground">Lead time:</span> <strong>{s.lead_time_days || 7} days</strong></p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
