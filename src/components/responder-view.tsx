
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Siren, MapPin, Loader2, ShieldPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type AlertStatus = "idle" | "routing" | "received" | "accepted";
type Geolocation = {
  latitude: number;
  longitude: number;
};
type Gender = 'male' | 'female' | 'trans';
type AlertData = {
  phone: string;
  location: Geolocation;
  gender: Gender;
};

// This is a global listener for our simulation
let alertListener: ((gender: Gender) => void) | null = null;

export function ResponderView() {
  const { user } = useAuth();
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("idle");
  const { toast } = useToast();

  // Mock data for a received alert
  const [alertData, setAlertData] = useState<AlertData>({
      phone: '(555) 123-4567',
      location: { latitude: 34.0522, longitude: -118.2437 },
      gender: 'female',
  });

  // Effect for partner users to listen for alerts
  useEffect(() => {
    if (user?.userType === 'partner') {
      const partnerGender = user.partnerType;
      const handleAlert = (alertGender: Gender) => {
        if (partnerGender === alertGender) {
          setAlertStatus("received");
        }
      };

      alertListener = handleAlert;

      // --- Simulation Trigger ---
      // In a real app, this would be a WebSocket or Firestore listener.
      // Here, we just simulate an alert coming in for demo purposes.
      const demoTimer = setTimeout(() => {
          if (user.partnerType) {
            handleAlert(user.partnerType);
          }
      }, 7000);
      // --- End Simulation Trigger ---

      // Cleanup listener
      return () => {
        alertListener = null;
        clearTimeout(demoTimer);
      };
    }
  }, [user]);

  // Effect to simulate alert routing timeouts
  useEffect(() => {
    if (alertStatus === "routing") {
      const timer = setTimeout(() => {
        // If a partner has subscribed, trigger their listener
        if (alertListener && user?.partnerType) {
            alertListener(user.partnerType);
            setAlertStatus('received'); // Go back to received state for next user
        }
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [alertStatus, user?.partnerType]);

  const handleAccept = () => {
    setAlertStatus("accepted");
    toast({
      title: "Help is on the way!",
      description: "Please proceed to the location shown.",
    });
  };

  const handleDecline = () => {
    setAlertStatus("routing");
    toast({
      title: "Alert Declined",
      description: "Rerouting to the next nearest user. Please wait.",
    });
  };

  const resetSimulation = () => {
    setAlertStatus("idle");
    // In a real app you might want to re-trigger the listener simulation
  };

  if (alertStatus === "routing") {
    return (
        <div className="flex flex-col items-center gap-6 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
                Finding Next Responder...
            </h2>
            <p className="text-muted-foreground max-w-sm">
                You have declined the alert. We are searching for the next nearest responder.
            </p>
        </div>
        </div>
    )
  }

  if (alertStatus === "accepted") {
    return (
      <Card className="max-w-2xl mx-auto shadow-xl animate-in fade-in-50 duration-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-3 text-2xl text-primary">
            <MapPin />
            Proceed to Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p>
            The person in need is at the following location. Thank you for
            helping!
          </p>
          <div className="rounded-lg overflow-hidden border">
            <Image
              src={`https://placehold.co/800x400?text=Map+to+Location`}
              alt="Map placeholder"
              width={800}
              height={400}
              data-ai-hint="map street"
              className="w-full"
            />
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="text-sm bg-muted p-3 rounded-md font-mono">
              <p className="font-bold text-muted-foreground">Location:</p>
              Lat: {alertData.location.latitude.toFixed(6)}, <br />
              Lon: {alertData.location.longitude.toFixed(6)}
            </div>
            <div className="text-sm bg-muted p-3 rounded-md font-mono">
              <p className="font-bold text-muted-foreground">Contact:</p>
              {alertData.phone}
            </div>
          </div>
          <Button
            onClick={resetSimulation}
            variant="outline"
            className="mt-4"
          >
            Reset Simulation
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="max-w-md mx-auto text-center animate-in fade-in-50 duration-500">
          <CardHeader>
              <CardTitle className="flex items-center justify-center gap-3">
                  <ShieldPlus className="text-primary"/>
                  You Are Ready to Help
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
              <p className="text-muted-foreground">
                  You are currently online and will be notified if someone nearby needs your assistance.
              </p>
              <p className="text-sm font-semibold text-primary capitalize rounded-full bg-primary/10 px-3 py-1 inline-block">
                  Your Responder Type: {user?.partnerType}
              </p>
          </CardContent>
      </Card>

      <AlertDialog open={alertStatus === "received"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <Siren className="text-destructive h-6 w-6" />
              <span className="text-destructive">Emergency Alert</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Someone nearby needs your help. Are you available to respond?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDecline}>
              No
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
