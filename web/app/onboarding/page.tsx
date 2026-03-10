"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useStatus, useSignMessage } from "@luno-kit/react";
import { useConnectModal } from "@luno-kit/ui";
import { useAuthStore } from "@/lib/auth-store";
import type { Role } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { SparklesText } from "@/components/ui/sparkles-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShineBorder } from "@/components/ui/shine-border";
import { GraduationCap, BookOpen, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const { address } = useAccount();
  const connectionStatus = useStatus();
  const { open: openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();

  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const requestChallenge = useAuthStore((s) => s.requestChallenge);
  const register = useAuthStore((s) => s.register);

  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const isConnected = connectionStatus === "connected" && !!address;

  // If already registered, redirect
  useEffect(() => {
    if (user) {
      router.push(user.role === "Teacher" ? "/dashboard" : "/courses");
    }
  }, [user, router]);

  async function handleSubmit() {
    if (!address || !selectedRole || !displayName.trim()) return;

    try {
      // Challenge / sign / register flow
      const nonce = await requestChallenge(address);
      const { signature } = await signMessageAsync({ message: nonce });
      const newUser = await register(
        address,
        signature,
        nonce,
        displayName.trim(),
        selectedRole,
      );
      toast.success(
        `Welcome, ${newUser.display_name}! You're registered as a ${newUser.role}.`,
      );
      router.push(newUser.role === "Teacher" ? "/dashboard" : "/courses");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("Cancelled") ||
        msg.includes("cancel") ||
        msg.includes("Rejected")
      ) {
        toast.warning("Signature cancelled.");
      } else {
        toast.error(
          "Registration failed. The wallet might already be registered.",
        );
      }
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <BlurFade delay={0.1}>
          <div className="mb-8 text-center">
            <SparklesText
              className="text-3xl font-bold sm:text-4xl"
              sparklesCount={4}
            >
              Welcome Aboard
            </SparklesText>
            <p className="mt-3 text-muted-foreground">
              Set up your profile to start learning and earning.
            </p>
          </div>
        </BlurFade>

        {/* Step 1: Connect wallet */}
        {!isConnected ? (
          <BlurFade delay={0.2}>
            <Card className="relative overflow-hidden">
              <ShineBorder
                shineColor={["#e6007a", "#552bbf"]}
                borderWidth={1}
              />
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Connect Your Wallet
                </CardTitle>
                <CardDescription>
                  Connect a wallet to save progress and (optionally) enable
                  on-chain payments and rewards.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ShimmerButton
                  onClick={() => openConnectModal?.()}
                  className="h-11 px-8"
                  shimmerColor="#e6007a"
                >
                  Connect Wallet
                </ShimmerButton>
              </CardContent>
            </Card>
          </BlurFade>
        ) : (
          <BlurFade delay={0.2}>
            <Card className="relative overflow-hidden">
              <ShineBorder
                shineColor={["#e6007a", "#552bbf"]}
                borderWidth={1}
              />
              <CardHeader>
                <CardTitle>Create Your Profile</CardTitle>
                <CardDescription>
                  Choose a role carefully -- it cannot be changed later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Display name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="Enter your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={255}
                  />
                </div>

                {/* Role selection */}
                <div className="space-y-3">
                  <Label>Choose Your Role</Label>
                  <p className="text-xs text-muted-foreground">
                    This is permanent and cannot be changed after registration.
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RoleCard
                      role="Student"
                      icon={GraduationCap}
                      description="Learn from courses and earn rewards by taking quizzes."
                      selected={selectedRole === "Student"}
                      onClick={() => setSelectedRole("Student")}
                    />
                    <RoleCard
                      role="Teacher"
                      icon={BookOpen}
                      description="Create courses, add lessons, and set prices for students."
                      selected={selectedRole === "Teacher"}
                      onClick={() => setSelectedRole("Teacher")}
                    />
                  </div>
                </div>

                {/* Wallet display */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Connected wallet
                  </p>
                  <p className="mt-1 font-mono text-sm truncate">{address}</p>
                </div>

                {/* Submit */}
                <Button
                  className="w-full h-11"
                  onClick={handleSubmit}
                  disabled={!displayName.trim() || !selectedRole || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </CardContent>
            </Card>
          </BlurFade>
        )}
      </div>
    </div>
  );
}

function RoleCard({
  role,
  icon: Icon,
  description,
  selected,
  onClick,
}: {
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all hover:border-primary/50",
        selected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="font-semibold">{role}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
