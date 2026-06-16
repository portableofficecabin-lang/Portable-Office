"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().email("Valid email required").max(255),
  rating: z.number().int().min(1, "Please select a rating").max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(15, "Please write at least 15 characters").max(1500),
});

const otpDetailsSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().email("Valid email required").max(255),
});

type Props = {
  productSlug: string;
  productName: string;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
};

type Step = "form" | "otp-details" | "otp-verify" | "otp-review" | "done";

export function ReviewSubmitModal({ productSlug, productName, open, onClose, onSubmitted }: Props) {
  const [requireOtp, setRequireOtp] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "reviews_require_otp")
        .maybeSingle();
      const enabled = data?.value === true || (data?.value as any)?.enabled === true;
      setRequireOtp(!!enabled);
      setStep(enabled ? "otp-details" : "form");
    })();
  }, [open]);

  const reset = () => {
    setStep(requireOtp ? "otp-details" : "form");
    setName(""); setEmail(""); setPhone(""); setOtp("");
    setRating(0); setHoverRating(0); setTitle(""); setBody("");
  };

  const handleClose = () => { reset(); onClose(); };

  const insertReview = async () => {
    const { error } = await supabase.from("product_reviews").insert({
      product_slug: productSlug,
      rating,
      title: title.trim() || null,
      body: body.trim(),
      reviewer_name: name.trim(),
      reviewer_email: email.trim().toLowerCase(),
      reviewer_phone: phone.trim() || null,
      status: "pending",
      verified_purchase: false,
    });
    if (error) throw error;
  };

  const submitDirect = async () => {
    const parsed = schema.safeParse({ name, email, rating, title, body });
    if (!parsed.success) {
      toast({ title: "Check your review", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await insertReview();
      setStep("done");
      onSubmitted?.();
    } catch (e: any) {
      toast({ title: "Could not submit review", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    const parsed = otpDetailsSchema.safeParse({ name, email });
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("send-booking-otp", {
        body: { email: email.trim().toLowerCase(), customer_name: name.trim() },
      });
      if (error) throw error;
      toast({ title: "Verification code sent", description: `Check ${email} for a 6-digit code.` });
      setStep("otp-verify");
    } catch (e: any) {
      toast({ title: "Could not send code", description: e.message || "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-booking-otp", {
        body: { email: email.trim().toLowerCase(), otp },
      });
      if (error) throw error;
      if (!data?.valid) {
        toast({ title: "Invalid or expired code", variant: "destructive" });
        return;
      }
      setStep("otp-review");
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const submitAfterOtp = async () => {
    const parsed = schema.safeParse({ name, email, rating, title, body });
    if (!parsed.success) {
      toast({ title: "Check your review", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await insertReview();
      setStep("done");
      onSubmitted?.();
    } catch (e: any) {
      toast({ title: "Could not submit review", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const RatingPicker = (
    <div>
      <Label>Your rating *</Label>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
            className="p-1"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                (hoverRating || rating) >= n
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            {step === "done"
              ? "Thank you — your review is awaiting moderation."
              : `Share your honest experience with ${productName}.`}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="rv-name">Your name *</Label>
              <Input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label htmlFor="rv-email">Email *</Label>
              <Input id="rv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            </div>
            <div>
              <Label htmlFor="rv-phone">Phone (optional)</Label>
              <Input id="rv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
            </div>
            {RatingPicker}
            <div>
              <Label htmlFor="rv-title">Review title (optional)</Label>
              <Input id="rv-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label htmlFor="rv-body">Your review *</Label>
              <Textarea
                id="rv-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={1500}
                placeholder="Describe your experience with the product — quality, delivery, support, etc."
              />
              <p className="text-xs text-muted-foreground mt-1">{body.length}/1500</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Every review is moderated by our team before publishing, in line with
              Google's review content policy.
            </p>
            <Button className="w-full" onClick={submitDirect} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit review
            </Button>
          </div>
        )}

        {step === "otp-details" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="rv-name">Your name *</Label>
              <Input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label htmlFor="rv-email">Email * (for verification)</Label>
              <Input id="rv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            </div>
            <div>
              <Label htmlFor="rv-phone">Phone (optional)</Label>
              <Input id="rv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
            </div>
            <p className="text-xs text-muted-foreground">
              We'll send a 6-digit code to verify you're a real person.
            </p>
            <Button className="w-full" onClick={sendOtp} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send verification code
            </Button>
          </div>
        )}

        {step === "otp-verify" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="rv-otp">Enter 6-digit code sent to {email}</Label>
              <Input
                id="rv-otp"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="text-center tracking-[0.5em] font-mono text-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("otp-details")} disabled={busy}>
                Back
              </Button>
              <Button className="flex-1" onClick={verifyOtp} disabled={busy || otp.length !== 6}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
            </div>
          </div>
        )}

        {step === "otp-review" && (
          <div className="space-y-4">
            {RatingPicker}
            <div>
              <Label htmlFor="rv-title">Review title (optional)</Label>
              <Input id="rv-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label htmlFor="rv-body">Your review *</Label>
              <Textarea
                id="rv-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={1500}
              />
              <p className="text-xs text-muted-foreground mt-1">{body.length}/1500</p>
            </div>
            <Button className="w-full" onClick={submitAfterOtp} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit review
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center py-4">
            <div className="text-5xl">✓</div>
            <p className="text-muted-foreground">
              Your review has been received and will appear on the site after admin
              approval (usually within 24 hours).
            </p>
            <Button className="w-full" onClick={handleClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
