
"use client";

import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { ShieldPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlerterView } from "@/components/alerter-view";
import { ResponderView } from "@/components/responder-view";

export default function Home() {
  const { user } = useAuth();

  const renderContent = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center gap-8 animate-in fade-in-50 duration-500">
          <ShieldPlus className="h-24 w-24 text-primary/80" />
          <div className="max-w-xl mx-auto space-y-2 text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Need Assistance?
            </h2>
            <p className="text-muted-foreground">
              Your location will be shared to guide them to you. Please sign in or create an account to send or receive alerts.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
             <Button asChild className="w-full rounded-full" size="lg">
                <Link href="/signin">
                    <LogIn />
                    Sign In
                </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/signup">
                    Create Account
                </Link>
            </Button>
          </div>
        </div>
      );
    }

    if (user.userType === 'public') {
      return <AlerterView />;
    }

    if (user.userType === 'partner') {
      return <ResponderView />;
    }

    return null;
  }

  return (
    <div className="container mx-auto text-center flex-grow flex items-center justify-center">
      {renderContent()}
    </div>
  );
}
