
"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, Siren, Loader2, ShieldPlus, User, UserRound, Users, CircleHelp, XCircle } from "lucide-react";
import { collection, addDoc, serverTimestamp, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AlertStatus = "idle" | "sending" | "sent" | "accepted" | "error";
type Gender = 'male' | 'female' | 'trans';
type Geolocation = {
  latitude: number;
  longitude: number;
};
type AlertData = {
  phone: string;
  location: Geolocation;
  gender: Gender;
};

const formSchema = z.object({
  phone: z
    .string()
    .min(10, "A valid phone number is required.")
    .max(20, "Phone number is too long."),
});

const genderOptions: { id: Gender; label: string; icon: React.ElementType }[] = [
  { id: 'male', label: 'Gents', icon: User },
  { id: 'female', label: 'Ladies', icon: UserRound },
  { id: 'trans', label: 'Trans', icon: Users },
];

export function AlerterView() {
  const { user } = useAuth();
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("idle");
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<Geolocation | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: "" },
  });

  useEffect(() => {
    if (!activeAlertId) return;

    const unsub = onSnapshot(doc(db, "alerts", activeAlertId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.status === 'accepted') {
          setAlertStatus("accepted");
        }
      } else {
        // Document was deleted (either accepted and reset, or cancelled)
        if (alertStatus !== 'accepted') {
           resetSimulation();
        }
      }
    });

    return () => unsub();
  }, [activeAlertId, alertStatus]);


  const handleSendAlertClick = () => {
    if (!selectedGender) {
      toast({
        variant: "destructive",
        title: "Selection Required",
        description: "Please select a gender option before sending an alert.",
      });
      return;
    }
    
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setShowSendDialog(true);
      },
      (error) => {
        toast({
          variant: "destructive",
          title: "Geolocation Error",
          description:
            error.code === error.PERMISSION_DENIED
              ? "Please allow location access to send an alert."
              : error.message,
        });
      }
    );
  };

  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!location || !selectedGender || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Location, gender, and user authentication are required.",
      });
      return;
    }
    
    setIsSubmitting(true);
    const currentAlertData = { phone: values.phone, location, gender: selectedGender };
    setAlertData(currentAlertData);
    setAlertStatus("sent");
    setShowSendDialog(false);

    try {
        const docRef = await addDoc(collection(db, "alerts"), {
            alerterId: user.uid,
            phone: values.phone,
            location: currentAlertData.location,
            gender: currentAlertData.gender,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        setActiveAlertId(docRef.id);
        toast({
            title: "Alert Sent!",
            description: "We are notifying the nearest available user.",
        });
    } catch (error) {
        console.error("Error sending alert:", error);
        toast({
            variant: "destructive",
            title: "Failed to Send Alert",
            description: "Could not create alert in the database. Please try again.",
        });
        resetSimulation();
    } finally {
        setIsSubmitting(false);
        form.reset();
    }
  };

  const cancelAlert = async () => {
    if (activeAlertId) {
      try {
        await deleteDoc(doc(db, "alerts", activeAlertId));
        toast({
          title: "Alert Cancelled",
          description: "Your request for help has been cancelled.",
        });
      } catch (error) {
        console.error("Error cancelling alert:", error);
        toast({
          variant: "destructive",
          title: "Cancellation Failed",
          description: "Could not cancel the alert. Please try again.",
        });
      }
    }
    resetSimulation();
  };

  const resetSimulation = () => {
    setAlertStatus("idle");
    setAlertData(null);
    setSelectedGender(null);
    setLocation(null);
    setActiveAlertId(null);
  };
  
  if (alertStatus === "idle") {
    return (
      <div className="flex flex-col items-center gap-8 animate-in fade-in-50 duration-500">
        <ShieldPlus className="h-24 w-24 text-primary/80" />
        <div className="max-w-xl mx-auto space-y-2 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Need Assistance?
          </h2>
          <p className="text-muted-foreground">
            Select the type of responder you need and press the button below. Your location will be shared to guide them to you.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          {genderOptions.map(({ id, label, icon: Icon }) => (
            <div key={id} className="flex flex-col items-center gap-2">
              <Button
                variant={selectedGender === id ? 'default' : 'outline'}
                size="icon"
                className={cn(
                  "w-20 h-20 rounded-full transition-all duration-200 shadow-md hover:shadow-lg",
                  selectedGender === id && "bg-primary text-primary-foreground ring-4 ring-primary/20"
                )}
                onClick={() => setSelectedGender(id)}
              >
                <Icon className="h-8 w-8" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className={cn(
            "h-24 w-64 text-2xl font-bold rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none",
            !selectedGender && "animate-none",
             selectedGender && "animate-pulse-slow"
          )}
          onClick={handleSendAlertClick}
          disabled={!selectedGender}
        >
          <Siren className="mr-4 h-8 w-8" />
          SEND ALERT
        </Button>

        <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirm Alert</DialogTitle>
                    <DialogDescription>
                    Please provide your phone number. Your current location will be
                    sent along with the alert.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                    onSubmit={form.handleSubmit(handleFormSubmit)}
                    className="space-y-4 pt-4"
                    >
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                placeholder="e.g., (123) 456-7890"
                                {...field}
                                className="pl-10"
                                />
                            </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <Siren />
                        )}
                        {isSubmitting
                            ? "Sending..."
                            : "Confirm and Send Alert"}
                        </Button>
                    </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  if (alertStatus === "accepted" && alertData) {
      return (
         <Card className="max-w-md mx-auto text-center animate-in fade-in-50 duration-500">
            <CardHeader>
                <CardTitle className="text-primary flex items-center justify-center gap-3">
                    <CircleHelp />
                    Help is On The Way!
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p>A responder has accepted your alert and is en route to your location. Please stay safe.</p>
                <p className="text-sm bg-muted p-3 rounded-md font-mono">
                    Lat: {alertData.location.latitude.toFixed(6)}, Lon:{" "}
                    {alertData.location.longitude.toFixed(6)}
                </p>
                 <Button
                    onClick={resetSimulation}
                    variant="outline"
                    className="mt-4"
                >
                    End Alert
                </Button>
            </CardContent>
        </Card>
      )
  }

  if (alertStatus === "sent") {
     return (
      <div className="flex flex-col items-center gap-6 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
                Contacting Help...
            </h2>
            <p className="text-muted-foreground max-w-sm">
                We are searching for the nearest available {selectedGender} responder. Please wait a moment.
            </p>
        </div>
        <Button variant="outline" onClick={cancelAlert}>
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Alert
        </Button>
      </div>
    );
  }
  
  return null;
}
