"use client";

import Link from "next/link";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { KeyRound, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Could not send reset link", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <Layout>
      <SEOHead title="Forgot Password | Portable Office Cabin" description="Reset your account password securely via email." />
      <section className="section-padding bg-gradient-to-b from-muted/50 to-background">
        <div className="container-custom max-w-md">
          <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8">
            {sent ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">Check your email</h1>
                <p className="text-muted-foreground mt-3">
                  We've sent a password reset link to <span className="font-semibold text-foreground">{email}</span>.
                  Click the link to set a new password.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Didn't get it? Check your spam folder, or{" "}
                  <button onClick={() => setSent(false)} className="text-accent font-semibold hover:underline">try again</button>.
                </p>
                <Button variant="outline" asChild className="mt-6">
                  <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Login</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="h-8 w-8 text-accent" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground">Forgot Password?</h1>
                  <p className="text-muted-foreground mt-2">Enter your email and we'll send you a reset link</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" required />
                    </div>
                  </div>
                  <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
                    {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>) : "Send Reset Link"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Remember your password?{" "}
                  <Link href="/login" className="text-accent font-semibold hover:underline">Sign In</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
