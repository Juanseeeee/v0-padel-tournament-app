"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, LogOut, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AdminWrapperProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  headerActions?: React.ReactNode;
  showBackButton?: boolean;
}

export function AdminWrapper({ 
  children, 
  title, 
  description, 
  headerActions,
  showBackButton = true 
}: AdminWrapperProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 font-sans relative overflow-x-hidden">
      {/* Background Pattern - Subtle Gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      
      {/* Curved Hero Section */}
      <div className="relative z-10 w-full rounded-b-[3rem] bg-gradient-to-br from-secondary to-secondary/90 px-6 pt-8 pb-28 text-white shadow-2xl transition-all overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />
        
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
                {showBackButton ? (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white hover:bg-white/10" 
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                ) : (
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                        <Shield className="h-5 w-5 text-primary" />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={handleLogout} disabled={loggingOut}>
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
        </div>

        {/* Page Title & Actions */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between animate-in fade-in zoom-in duration-500">
            <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-white drop-shadow-sm font-[var(--font-display)]">
                    {title}
                </h2>
                {description && (
                    <p className="text-white/70 text-sm md:text-base max-w-2xl">
                        {description}
                    </p>
                )}
            </div>
            
            {headerActions && (
                <div className="flex gap-2">
                    {headerActions}
                </div>
            )}
        </div>
      </div>

      {/* Main Content Area - Overlapping */}
      <div className="relative z-20 -mt-16 px-4 md:px-8 space-y-6 pb-10 max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}
