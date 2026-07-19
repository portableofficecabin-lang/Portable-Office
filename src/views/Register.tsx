"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { UserPlus, Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OTPVerificationModal } from "@/components/booking/OTPVerificationModal";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showOTP, setShowOTP] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const router = useRouter();

  const sendOTP = async () => {
    const { data, error } = await supabase.functions.invoke("send-booking-otp", {
      body: { email: email.trim().toLowerCase(), customer_name: fullName.trim() },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await sendOTP();
      toast({ title: "Verification code sent", description: `Check ${email} for a 6-digit code.` });
      setShowOTP(true);
    } catch (err: any) {
      // Email may still have been sent
      setShowOTP(true);
      toast({ title: "Verification code sent", description: "Check your inbox. If you didn't receive it, click resend." });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (otp: string) => {
    setVerifying(true);
    setOtpError(null);
    try {
      const { data, error } = await supabase.functions.invoke("signup-with-otp", {
        body: {
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
          otp,
        },
      });
      if (error) {
        setOtpError("Service unavailable. Please try again.");
        return;
      }
      if (data?.error) {
        setOtpError(data.error);
        return;
      }
      if (!data?.success) {
        setOtpError("Could not create account. Please try again.");
        return;
      }

      // Auto sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      setShowOTP(false);
      if (signInError) {
        toast({ title: "Account created!", description: "Please sign in with your credentials." });
        router.push("/login");
      } else {
        toast({ title: "Welcome!", description: "Your account has been created and verified." });
        router.push("/my-account");
      }
    } catch (err: any) {
      setOtpError(err.message || "Something went wrong");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Layout>
      <SEOHead title="Create Account | Portable Office Cabin" description="Create an account to track your orders and quote requests. Standard products can be bought and paid for online; customised builds are confirmed by written quotation. An account is optional — guest checkout is available." />
      <section className="section-padding bg-gradient-to-b from-muted/50 to-background">
        <div className="container-custom max-w-md">
          <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-8 w-8 text-accent" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">Create Account</h1>
              <p className="text-muted-foreground mt-2">We'll email a 6-digit code to verify your address</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="pl-10" required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" required />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
                {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending Code...</>) : "Send Verification Code"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-accent font-semibold hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </section>

      <OTPVerificationModal
        isOpen={showOTP}
        onClose={() => setShowOTP(false)}
        onVerify={handleVerify}
        onResend={async () => { await sendOTP(); }}
        email={email}
        isVerifying={verifying}
        error={otpError}
        verifyButtonLabel="Verify & Create Account"
        verifyingLabel="Creating account..."
      />
    </Layout>
  );
}
