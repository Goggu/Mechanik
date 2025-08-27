
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, Siren, MapPin, Loader2, ShieldPlus, User, UserRound, Users, LogIn, CircleHelp } from "lucide-react";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useAuth } from "@/hooks/use-auth";

type AlertStatus =
  | "idle"
  | "sending"
  | "sent"
  | "received"
  | "routing"
  | "accepted"
  | "error";

type Geolocation = {
  latitude: number;
  longitude: number;
};

type AlertData = {
  phone: string;
  location: Geolocation;
  gender: Gender;
};

type Gender = 'male' | 'female' | 'trans';

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

// This is a global listener for our simulation
let alertListener: ((gender: Gender) => void) | null = null;

export default function Home() {
  const { user } = useAuth();
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("idle");
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: "" },
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

      // Cleanup listener when the component unmounts or user changes
      return () => {
        alertListener = null;
      };
    }
  }, [user]);


  // Effect to simulate alert routing timeouts
  useEffect(() => {
    if (alertStatus === "sent" || alertStatus === "routing") {
      const timer = setTimeout(() => {
        // If a partner has subscribed, trigger their listener
        if (alertListener && selectedGender) {
            alertListener(selectedGender);
        }
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [alertStatus, selectedGender]);

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    if (!selectedGender) {
      toast({
        variant: "destructive",
        title: "Selection Required",
        description: "Please select a gender option before sending an alert.",
      });
      return;
    }
    setIsSubmitting(true);
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
      });
      setIsSubmitting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setAlertData({ phone: values.phone, location: { latitude, longitude }, gender: selectedGender });
        setAlertStatus("sent");
        setShowSendDialog(false);
        toast({
          title: "Alert Sent!",
          description: "We are notifying the nearest available user.",
        });
        setIsSubmitting(false);
        form.reset();
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
        setIsSubmitting(false);
      }
    );
  };

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
    setAlertData(null);
    setSelectedGender(null);
  };
  
  const renderContent = () => {
    // If user is not logged in
    if (!user) {
      return (
         <Card className="max-w-xl mx-auto animate-in fade-in-50 duration-500">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Logo className="h-8 w-8 text-primary"/>
                    Welcome to HelpNow
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                    Your community-based safety network. Please sign in or create an account to send or receive alerts.
                </p>
                <div className="flex gap-4">
                     <Button asChild className="w-full">
                        <Link href="/signin">
                            <LogIn />
                            Sign In
                        </Link>
                    </Button>
                    <Button asChild variant="secondary" className="w-full">
                        <Link href="/signup">
                            Create Account
                        </Link>
                    </Button>
                </div>
            </CardContent>
         </Card>
      );
    }

    // If user is a partner
    if (user.userType === 'partner') {
       if (alertStatus === "accepted" && alertData) {
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
                  src="https://placehold.co/800x400"
                  alt="Map placeholder"
                  width={800}
                  height={400}
                  data-ai-hint="map street"
                  className="w-full"
                />
              </div>
              <div className="text-sm bg-muted p-3 rounded-md font-mono">
                Lat: {alertData.location.latitude.toFixed(6)}, Lon:{" "}
                {alertData.location.longitude.toFixed(6)}
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
                    Your Responder Type: {user.partnerType}
                </p>
            </CardContent>
        </Card>
      )
    }

    // If user is public
    if (user.userType === 'public') {
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
              onClick={() => setShowSendDialog(true)}
              disabled={!selectedGender}
            >
              <Siren className="mr-4 h-8 w-8" />
              SEND ALERT
            </Button>
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

      if (alertStatus === "sent" || alertStatus === "routing") {
         return (
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <h2 className="text-2xl font-semibold">
              {alertStatus === "sent"
                ? "Contacting Help..."
                : "Finding Next Responder..."}
            </h2>
            <p className="text-muted-foreground max-w-sm">
                We are searching for the nearest available {selectedGender} responder. Please wait a moment.
            </p>
          </div>
        );
      }
    }
    
    // Fallback for any other case
    return null;
  }


  return (
    <>
      <div className="container mx-auto text-center flex-grow flex items-center justify-center">
        {renderContent()}
      </div>

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

      <AlertDialog open={alertStatus === "received"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <Siren className="text-destructive h-6 w-6" />
              <span className="text-destructive">Emergency Alert</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Someone nearby needs your help. Are you available to respond and
              go to their location?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDecline}>
              No, I can't
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept}>
              Yes, I can help
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Simple Logo component to be used in the logged-out view
function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}
