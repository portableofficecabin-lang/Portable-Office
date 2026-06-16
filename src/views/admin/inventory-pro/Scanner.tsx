"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Camera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => () => { stop(); }, []);

  async function start() {
    setResult(null); setScanning(true);
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decoded) => { await handleResult(decoded); stop(); },
        () => {}
      );
    } catch (e: any) {
      setScanning(false);
      alert("Camera access required: " + e?.message);
    }
  }

  async function stop() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); await scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function handleResult(text: string) {
    try {
      const data = JSON.parse(text);
      if (data.type === "rental" && data.id) {
        const { data: asset } = await supabase.from("rental_assets").select("*, factories(name)").eq("id", data.id).maybeSingle();
        const { data: assignment } = await supabase.from("rental_assignments").select("*").eq("asset_id", data.id).eq("status", "active").maybeSingle();
        setResult({ type: "rental", asset, assignment, raw: text });
        return;
      }
      setResult({ type: "unknown", raw: text, parsed: data });
    } catch {
      setResult({ type: "text", raw: text });
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <QrCode className="h-8 w-8 text-amber-500" />
          <div>
            <h3 className="font-display font-bold text-lg">QR Code Scanner</h3>
            <p className="text-sm text-muted-foreground">Scan rental cabin QR codes to view assignment & history</p>
          </div>
        </div>

        <div id="qr-reader" className="rounded-xl overflow-hidden bg-slate-900 min-h-[280px] flex items-center justify-center text-white">
          {!scanning && <div className="text-center p-8"><Camera className="h-12 w-12 mx-auto mb-2 opacity-50" /><div className="text-sm opacity-70">Camera preview</div></div>}
        </div>

        <div className="flex gap-2 mt-4">
          {!scanning ? (
            <Button onClick={start} className="flex-1 bg-gradient-to-r from-slate-900 to-slate-700"><Camera className="h-4 w-4 mr-2" />Start Scanner</Button>
          ) : (
            <Button onClick={stop} variant="outline" className="flex-1"><X className="h-4 w-4 mr-2" />Stop</Button>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-card border border-border rounded-2xl p-6 max-w-xl mx-auto">
          <h4 className="font-bold mb-3">Scan Result</h4>
          {result.type === "rental" && result.asset ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2"><Badge>{result.asset.cabin_id}</Badge> <Badge variant="outline">{result.asset.cabin_type}</Badge></div>
              <div className="text-sm">Status: <Badge variant={result.asset.status === "available" ? "default" : "outline"}>{result.asset.status}</Badge></div>
              <div className="text-sm">Location: {result.asset.current_location || result.asset.factories?.name || "—"}</div>
              <div className="text-sm">Monthly Rent: ₹{Number(result.asset.monthly_rent).toLocaleString("en-IN")}</div>
              {result.assignment && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-sm mt-3">
                  <div><b>Customer:</b> {result.assignment.customer_name}</div>
                  <div><b>Phone:</b> {result.assignment.customer_phone || "—"}</div>
                  <div><b>Site:</b> {result.assignment.site_address || "—"}</div>
                  <div><b>Dispatched:</b> {result.assignment.dispatch_date}</div>
                </div>
              )}
            </div>
          ) : (
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">{result.raw}</pre>
          )}
        </div>
      )}
    </div>
  );
}
