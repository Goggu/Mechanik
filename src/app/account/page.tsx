
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { User, Phone } from "lucide-react";
import { Loader2 } from "lucide-react";


export default function AccountPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
             <div className="flex items-center justify-center h-full w-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

  return (
    <div className="container mx-auto">
       <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User /> Account Information
          </CardTitle>
           <CardDescription>
            Your account details are based on your verified phone number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user && user.phoneNumber ? (
            <div className="flex items-center gap-3 bg-muted p-3 rounded-md">
                <Phone className="h-5 w-5 text-muted-foreground"/>
                <span className="font-mono text-lg">{user.phoneNumber}</span>
            </div>
          ) : (
             <p className="text-muted-foreground">Please sign in to view your account details.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
