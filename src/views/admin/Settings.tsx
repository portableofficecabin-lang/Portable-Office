"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Mail, Globe, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";

interface Setting { key: string; value: any; description?: string; }

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase.from("site_settings").select("*");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      const map: Record<string, any> = {};
      (data as Setting[]).forEach((s) => { map[s.key] = s.value; });
      setSettings(map);
    }
    setIsLoading(false);
  };

  const setValue = (key: string, field: string, val: any) => {
    setSettings((p) => ({ ...p, [key]: { ...(p[key] || {}), [field]: val } }));
  };

  const saveAll = async () => {
    setSaving(true);
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
    for (const row of rows) {
      const { data: existing } = await supabase.from("site_settings").select("id").eq("key", row.key).maybeSingle();
      if (existing) {
        await supabase.from("site_settings").update({ value: row.value }).eq("key", row.key);
      } else {
        await supabase.from("site_settings").insert(row);
      }
    }
    setSaving(false);
    toast({ title: "Settings saved" });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>;

  const business = settings.business || {};
  const notifications = settings.notifications || {};
  const inventory = settings.inventory || {};

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure business info, notifications and inventory rules" />

      <AdminCard delay={0.1}>
        <AdminCardHeader>
          <div className="flex items-center gap-2"><Globe className="h-5 w-5 text-accent" /> Business Information</div>
        </AdminCardHeader>
        <AdminCardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Company Name</Label><Input value={business.company_name || ""} onChange={(e) => setValue("business", "company_name", e.target.value)} placeholder="Portable Office Cabin" /></div>
            <div><Label>GST Number</Label><Input value={business.gst_number || ""} onChange={(e) => setValue("business", "gst_number", e.target.value)} /></div>
            <div><Label>Contact Email</Label><Input value={business.email || ""} onChange={(e) => setValue("business", "email", e.target.value)} /></div>
            <div><Label>Contact Phone</Label><Input value={business.phone || ""} onChange={(e) => setValue("business", "phone", e.target.value)} /></div>
          </div>
          <div><Label>Registered Address</Label><Textarea rows={2} value={business.address || ""} onChange={(e) => setValue("business", "address", e.target.value)} /></div>
        </AdminCardContent>
      </AdminCard>

      <AdminCard delay={0.2}>
        <AdminCardHeader>
          <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-accent" /> Notifications</div>
        </AdminCardHeader>
        <AdminCardContent className="space-y-4">
          <div><Label>Notify Email (new enquiries / appointments)</Label><Input value={notifications.notify_email || ""} onChange={(e) => setValue("notifications", "notify_email", e.target.value)} placeholder="sales@portableofficecabin.com" /></div>
          <div><Label>WhatsApp Notification Number</Label><Input value={notifications.whatsapp || ""} onChange={(e) => setValue("notifications", "whatsapp", e.target.value)} placeholder="+91 9..." /></div>
        </AdminCardContent>
      </AdminCard>

      <AdminCard delay={0.3}>
        <AdminCardHeader>
          <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-accent" /> Inventory Rules</div>
        </AdminCardHeader>
        <AdminCardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Default Low-Stock Threshold</Label><Input type="number" value={inventory.default_low_stock_threshold || 5} onChange={(e) => setValue("inventory", "default_low_stock_threshold", Number(e.target.value))} /></div>
            <div><Label>Reorder Lead Time (days)</Label><Input type="number" value={inventory.reorder_lead_time_days || 7} onChange={(e) => setValue("inventory", "reorder_lead_time_days", Number(e.target.value))} /></div>
          </div>
        </AdminCardContent>
      </AdminCard>

      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">SMTP credentials are securely stored in backend secrets and cannot be edited here.</p>
    </div>
  );
}
