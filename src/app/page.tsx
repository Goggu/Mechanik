
"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, Siren, Loader2, ShieldPlus, User, UserRound, Users, CircleHelp, XCircle, KeyRound } from "lucide-react";
import { collection, addDoc, serverTimestamp, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { ConfirmationResult } from "firebase/auth";

import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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

const phoneFormSchema = z.object({
  phone: z.string().min(10, "A valid phone number is required."),
});

const otpFormSchema = z.object({
  otp: z.string().min(6, "Your OTP must be 6 characters."),
});

const genderOptions: { id: Gender; label: string; icon: React.ElementType }[] = [
  { id: 'male', label: 'Gents', icon: User },
  { id: 'female', label: 'Ladies', icon: UserRound },
  { id: 'trans', label: 'Trans', icon: Users },
];

export default function Home() {
  const { user, loading, setupRecaptcha, confirmOtp } = useAuth();
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("idle");
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<Geolocation | null>(null);
  const { toast } = useToast();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otp: "" },
  });

  // Effect to proceed with alert creation after successful login.
  useEffect(() => {
    if (user && showAuthModal && selectedGender) {
      setShowAuthModal(false);
      // Now that the user is authenticated, get the location.
      getLocationAndCreateAlert();
    }
  }, [user, showAuthModal, selectedGender]);


  useEffect(() => {
    if (!activeAlertId) return;

    const unsub = onSnapshot(doc(db, "alerts", activeAlertId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.status === 'accepted') {
          setAlertStatus("accepted");
        }
      } else {
        // If doc is deleted and we haven't been accepted, it was cancelled.
        if (alertStatus !== 'accepted') {
           resetSimulation();
        }
      }
    });

    return () => unsub();
  }, [activeAlertId, alertStatus]);

  const handleSendOtp = async (values: z.infer<typeof phoneFormSchema>) => {
    setIsSubmitting(true);
    try {
      const result = await setupRecaptcha(values.phone);
      setConfirmationResult(result);
      setPhoneNumber(values.phone);
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: "Could not send verification code. Please check the phone number and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleVerifyOtp = async (values: z.infer<typeof otpFormSchema>) => {
    if (!confirmationResult) return;
    setIsSubmitting(true);
    try {
      await confirmOtp(confirmationResult, values.otp);
      // onAuthStateChanged in useAuth will set the user.
      // The useEffect hook will then close the modal and trigger alert creation.
       toast({
        variant: "success",
        title: "Phone Verified",
        description: "You are now signed in. Creating your alert...",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "The code you entered is incorrect. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
      otpForm.reset();
    }
  };

  const handleSendAlertClick = () => {
    if (!selectedGender) {
      toast({
        variant: "destructive",
        title: "Selection Required",
        description: "Please select a responder type before sending an alert.",
      });
      return;
    }

    if (!user) {
        setShowAuthModal(true);
        return;
    }
    
    // If user is already logged in, proceed directly.
    getLocationAndCreateAlert();
  };

  const getLocationAndCreateAlert = () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
      });
      return;
    }

    setIsSubmitting(true);
    setAlertStatus("sending"); // Indicate we are starting the process

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { latitude, longitude };
        setLocation(newLocation);
        handleAlertCreation(newLocation);
      },
      (error) => {
        setIsSubmitting(false);
        setAlertStatus("idle");
        toast({
          variant: "destructive",
          title: "Geolocation Error",
          description:
            error.code === error.PERMISSION_DENIED
              ? "Please allow location access to send an alert."
              : "Could not get your location.",
        });
      }
    );
  }

  const handleAlertCreation = async (currentLocation: Geolocation) => {
     if (!selectedGender || !user || !user.phoneNumber) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User authentication, gender selection, and location are required.",
      });
      setIsSubmitting(false);
      setAlertStatus("idle");
      return;
    }
    
    const currentAlertData = { phone: user.phoneNumber, location: currentLocation, gender: selectedGender };
    setAlertData(currentAlertData);
    setAlertStatus("sent");

    try {
        const docRef = await addDoc(collection(db, "alerts"), {
            alerterId: user.uid,
            phone: user.phoneNumber,
            location: currentAlertData.location,
            gender: currentAlertData.gender,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        setActiveAlertId(docRef.id);
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
    }
  };


  const cancelAlert = async () => {
    if (activeAlertId) {
      try {
        await deleteDoc(doc(db, "alerts", activeAlertId));
        toast({
            title: "Alert Cancelled",
            description: "Your alert has been successfully cancelled.",
            duration: 3000
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
    setIsSubmitting(false);
  };
  
  if (loading) {
    return (
      <div className="container mx-auto text-center flex-grow flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (alertStatus === "accepted" && alertData) {
      return (
        <div className="container mx-auto text-center flex-grow flex items-center justify-center">
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
        </div>
      )
  }

  if (alertStatus === "sent") {
     return (
      <div className="container mx-auto text-center flex-grow flex items-center justify-center">
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
      </div>
    );
  }

  return (
    <div className="container mx-auto text-center flex-grow flex items-center justify-center">
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent>
          {!confirmationResult ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Phone /> Get Started
                </DialogTitle>
                <DialogDescription>
                  Enter your phone number to continue. We'll send you a one-time code.
                </DialogDescription>
              </DialogHeader>
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
                  <FormField
                    control={phoneForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Send Code"}
                  </Button>
                </form>
              </Form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound /> Verify Code
                </DialogTitle>
                <DialogDescription>
                  Enter the 6-digit code sent to {phoneNumber}.
                </DialogDescription>
              </DialogHeader>
               <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-6 flex flex-col items-center">
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">One-Time Password</FormLabel>
                        <FormControl>
                          <InputOTP maxLength={6} {...field}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Verify & Continue"}
                  </Button>
                </form>
              </Form>
               <Button variant="link" size="sm" className="mt-2" onClick={() => {setConfirmationResult(null); phoneForm.reset()}}>
                  Use a different number
               </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      
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
             selectedGender && !isSubmitting && "animate-pulse-slow"
          )}
          onClick={handleSendAlertClick}
          disabled={isSubmitting}
        >
          {alertStatus === 'sending' ? (
            <>
              <Loader2 className="animate-spin h-8 w-8" />
              Please wait...
            </>
          ) : (
            <>
              <Siren className="mr-4 h-8 w-8" />
              SEND ALERT
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

    