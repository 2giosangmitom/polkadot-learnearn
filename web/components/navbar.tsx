"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@luno-kit/ui";
import { useAccount, useStatus } from "@luno-kit/react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Moon,
  Sun,
  Menu,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { RainbowButton } from "./ui/rainbow-button";
import { useWalletProvider } from "@/hooks/use-wallet-provider";

function SponsorConnectButton() {
  const { metamaskAddress, isConnected, connect, disconnect, isCorrectNetwork, switchNetwork } = useWalletProvider();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    try {
      await switchNetwork();
    } catch (error) {
      console.error('Switch network error:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (isConnected && metamaskAddress) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={disconnect}>
          <Wallet className="h-4 w-4" />
          {metamaskAddress.slice(0, 6)}...{metamaskAddress.slice(-4)}
        </Button>
        {!isCorrectNetwork && (
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
          >
            {isSwitching ? "Switching..." : "Switch Network"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button size="sm" className="gap-2" onClick={connect}>
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { address } = useAccount();
  const status = useStatus();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isSponsorPage = pathname === "/sponsor"; 

  const isConnected = status === "connected" && !!address;
  const needsOnboarding = isConnected && !user;
  const isTeacher = user?.role === "Teacher";

  const navLinks = [
    { href: "/courses", label: "Courses", icon: BookOpen },
    ...(isTeacher
      ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-20 w-20 items-center justify-center text-primary-foreground transition-transform group-hover:scale-105">
            <img src="/logo-removebg.png" alt="Learn & Earn" className="w-full" />
          </div>
          <span className="hidden font-bold text-lg sm:block">
            Learn<span className="text-primary">&</span>Earn
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant={pathname === link.href ? "secondary" : "ghost"}
                size="sm"
                className={cn("gap-2", pathname === link.href && "bg-secondary font-medium")}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {needsOnboarding && (
            <Link href="/onboarding">
              <Button size="sm" className="hidden sm:flex gap-2 animate-pulse">
                <GraduationCap className="h-4 w-4" />
                Get Started
              </Button>
            </Link>
          )}

          {isSponsorPage ? (
            <RainbowButton variant="outline">Sponsor</RainbowButton>
          ) : !user ? null : user.role === "Teacher" ? (
            <RainbowButton variant="outline">Teacher</RainbowButton>
          ) : (
            <RainbowButton variant="outline">Student</RainbowButton>
          )}

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}

          {isSponsorPage ? (
            <SponsorConnectButton />
          ) : (
            <ConnectButton label="Connect Wallet" showBalance chainStatus="icon" />
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="mt-8 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={pathname === link.href ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                ))}
                {needsOnboarding && (
                  <Link href="/onboarding">
                    <Button className="w-full justify-start gap-3">
                      <GraduationCap className="h-4 w-4" />
                      Get Started
                    </Button>
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}