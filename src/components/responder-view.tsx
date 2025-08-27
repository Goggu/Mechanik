
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Siren, MapPin, Loader2, ShieldPlus } from "lucide-react";
import { collection, query, where, onSnapshot, doc, runTransaction, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

type AlertStatus = "idle" | "received" | "accepted" | "error";
type Geolocation = {
  latitude: number;
  longitude: number;
};
type Gender = 'male' | 'female' | 'trans';

interface AlertDocument {
    id: string;
    phone: string;
    location: Geolocation;
    gender: Gender;
    createdAt: Timestamp;
    status: 'pending' | 'accepted';
    responderId?: string;
}

export function ResponderView() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AlertStatus>("idle");
  const [receivedAlert, setReceivedAlert] = useState<AlertDocument | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.userType !== 'partner' || !user.partnerType) return;

    const q = query(
      collection(db, "alerts"),
      where("gender", "==", user.partnerType),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            // If there are no pending alerts for this user, or if the alert they were viewing was taken
            if (status === 'received') {
                setReceivedAlert(null);
                setStatus('idle');
            }
            return;
        }

        // In a real app, you'd find the *nearest* alert. For simulation, we'll take the oldest.
        const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlertDocument));
        alerts.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
        const newestAlert = alerts[0];

        // Only show a new alert if we are idle
        if (status === 'idle') {
            setReceivedAlert(newestAlert);
            setStatus("received");
        }
    });

    return () => unsubscribe();
  }, [user, status]);

  const handleAccept = async () => {
    if (!receivedAlert || !user) return;

    const alertRef = doc(db, "alerts", receivedAlert.id);

    try {
        await runTransaction(db, async (transaction) => {
            const alertDoc = await transaction.get(alertRef);
            if (!alertDoc.exists() || alertDoc.data().status !== 'pending') {
                throw new Error("Alert is no longer available.");
            }
            transaction.update(alertRef, { status: 'accepted', responderId: user.uid });
        });
        
        setStatus("accepted");
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Alert Taken",
            description: error.message || "This alert was accepted by another responder.",
        });
        setStatus("idle");
        setReceivedAlert(null);
    }
  };

  const handleDecline = () => {
    // Just close the dialog, the listener will keep watching for other alerts.
    // In a more complex system, you might mark this alert so it's not shown to this user again.
    setStatus("idle");
    setReceivedAlert(null);
  };

  const resetSimulation = async () => {
    if (receivedAlert) {
      // The person who accepted the alert is responsible for deleting it.
      await deleteDoc(doc(db, "alerts", receivedAlert.id));
    }
    setStatus("idle");
    setReceivedAlert(null);
  };

  if (status === "accepted" && receivedAlert) {
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
              Lat: {receivedAlert.location.latitude.toFixed(6)}, <br />
              Lon: {receivedAlert.location.longitude.toFixed(6)}
            </div>
            <div className="text-sm bg-muted p-3 rounded-md font-mono">
              <p className="font-bold text-muted-foreground">Contact:</p>
              {receivedAlert.phone}
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

      <AlertDialog open={status === "received"}>
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
