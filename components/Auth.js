"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export default function Auth() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      setLoading(false);
      return;
    }
    if (mode === "signup") {
      const { error: e } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (e) {
        setError(e.message);
      } else {
        setInfo("Account created. Check email to confirm connection.");
        setMode("login");
      }
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (e) setError("Access denied. Invalid credentials.");
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      setError("Provide email to initiate reset.");
      return;
    }
    await supabase.auth.resetPasswordForEmail(email.trim());
    setInfo("Reset link sent to email.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Ambient background blur circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-coffee-800/20 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in z-10">
        <div className="mb-10 text-center">
          <h1 className="text-7xl font-bold tracking-tighter text-primary drop-shadow-sm mb-[-10px]">
            LOCK
          </h1>
          <h1 className="text-7xl font-bold tracking-tighter text-foreground">
            IN.
          </h1>
          <div className="mt-4 inline-block bg-card px-4 py-1.5 rounded-md border text-xs tracking-[0.2em] text-muted-foreground uppercase shadow-sm">
            {mode === "login" ? "Welcome Back" : "Start Your Journey"}
          </div>
        </div>

        <Card className="glass-panel backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-center text-foreground font-medium text-lg">
              {mode === "login" ? "Sign In" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="bg-background/50 focus:bg-background transition-colors"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="bg-background/50 focus:bg-background transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm font-medium">
                {error}
              </div>
            )}
            {info && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-primary text-sm font-medium">
                {info}
              </div>
            )}

            <Button
              className="w-full text-md h-12 mt-2"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Processing..." : mode === "login" ? "Sign In" : "Sign Up"}
            </Button>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-sm gap-2">
              <button
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                  setInfo("");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {mode === "login" ? "Create an account" : "Already have an account?"}
              </button>
              
              {mode === "login" && (
                <button
                  onClick={handleForgot}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Forgot password?
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
