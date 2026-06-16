"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { LogIn, Mail, Lock, Eye, EyeOff, User, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";

type LoginRole = "customer" | "admin" | null;

export default function LoginPage() {
  const [role, setRole] = useState<LoginRole>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!", description: "You have been logged in successfully." });
      router.push("/my-account");
    }
  };

  return (
    <Layout>
      <SEOHead title="Login | Portable Office Cabin" description="Log in to your account to manage orders and track purchases." />
      <section className="section-padding bg-gradient-to-b from-muted/50 to-background">
        <div className="container-custom max-w-md">
          <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8">
            {role === null ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <LogIn className="h-8 w-8 text-accent" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground">Choose Login Type</h1>
                  <p className="text-muted-foreground mt-2">Select how you want to sign in</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setRole("customer")}
                    className="group w-full text-left p-5 rounded-xl border border-border bg-gradient-to-br from-background to-muted/30 hover:border-accent hover:shadow-lg transition-all flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <User className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="font-display font-semibold text-foreground">Customer Login</div>
                      <p className="text-sm text-muted-foreground">Track orders, manage account & enquiries</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </button>

                  <button
                    onClick={() => router.push("/admin/login")}
                    className="group w-full text-left p-5 rounded-xl border border-border bg-gradient-to-br from-background to-muted/30 hover:border-primary hover:shadow-lg transition-all flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-display font-semibold text-foreground">Admin / Staff Login</div>
                      <p className="text-sm text-muted-foreground">CRM, ERP & dashboard access</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </button>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-8">
                  New customer?{" "}
                  <Link href="/register" className="text-accent font-semibold hover:underline">Create Account</Link>
                </p>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Forgot your password?{" "}
                  <Link href="/forgot-password" className="text-accent font-semibold hover:underline">Reset it here</Link>
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={() => setRole(null)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-accent" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground">Customer Login</h1>
                  <p className="text-muted-foreground mt-2">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
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
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end -mt-2">
                    <Link href="/forgot-password" className="text-sm text-accent hover:underline font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-accent font-semibold hover:underline">Create Account</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
