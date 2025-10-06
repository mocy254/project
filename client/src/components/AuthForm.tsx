import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [, setLocation] = useLocation();
  const { setUserId, setUserName } = useUser();
  const { toast } = useToast();

  const authMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name?: string }) => {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const res = await apiRequest("POST", endpoint, data);
      return await res.json();
    },
    onSuccess: (data) => {
      setUserId(data.userId);
      setUserName(data.name);
      toast({
        title: mode === "login" ? "Welcome back!" : "Account created!",
        description: mode === "login" ? "You've successfully signed in." : "Your account has been created successfully.",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Authentication failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    authMutation.mutate({ email, password, name });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-[hsl(258,90%,66%)]/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary mb-2">
            <Sparkles className="w-8 h-8" />
            <span className="font-display text-2xl font-bold">FlashGenius</span>
          </div>
          <CardTitle className="text-2xl font-display">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {mode === "login" 
              ? "Sign in to continue your learning journey" 
              : "Start creating AI-powered flashcards today"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-name"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold"
              data-testid="button-submit"
              disabled={authMutation.isPending}
            >
              {authMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                mode === "login" ? "Sign In" : "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            </span>{" "}
            <Link href={mode === "login" ? "/signup" : "/login"}>
              <a className="text-primary font-semibold hover:underline" data-testid="link-switch-mode">
                {mode === "login" ? "Sign Up" : "Sign In"}
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
