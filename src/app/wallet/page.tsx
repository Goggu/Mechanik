
"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Wallet, Landmark, ArrowLeftRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a whole number." })
    .int("Amount must be a whole number.")
    .positive("Amount must be a positive number.")
    .min(1, "Amount must be at least ₹1."),
});

type TransactionType = "deposit" | "withdraw";

export default function WalletPage() {
  const { user, setUserData } = useAuth();
  const { toast } = useToast();
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
  const [stagedAmount, setStagedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
    },
  });

  const handleWithdrawal = async (values: z.infer<typeof formSchema>) => {
     if (!user) return;
     setIsProcessing(true);
     await processTransaction(values.amount, 'withdraw');
     setIsProcessing(false);
  }

  const handleDepositInitiation = (values: z.infer<typeof formSchema>) => {
    setStagedAmount(values.amount);
  }

  const handleFinalizeDeposit = async () => {
    if (stagedAmount === null) return;
    setIsProcessing(true);
    await processTransaction(stagedAmount, 'deposit');
    setIsProcessing(false);
  }

  const processTransaction = async (amount: number, type: TransactionType) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User document not found.");
        }

        const currentBalance = userDoc.data().walletBalance || 0;
        let newBalance = currentBalance;

        if (type === "deposit") {
          newBalance += amount;
        } else {
          if (currentBalance < amount) {
            throw new Error("Insufficient funds for withdrawal.");
          }
          newBalance -= amount;
        }

        transaction.update(userRef, { walletBalance: newBalance });
      });

      const newBalance = (user.walletBalance || 0) + (type === 'deposit' ? amount : -amount);
      setUserData((prevUser) => prevUser ? { ...prevUser, walletBalance: newBalance } : null);

      toast({
        title: "Transaction Successful",
        description: `Your new balance is ₹${newBalance.toFixed(2)}.`,
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: error.message,
      });
    } finally {
      form.reset();
      setTransactionType(null);
      setStagedAmount(null);
    }
  };
  
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (transactionType === 'deposit') {
      handleDepositInitiation(values);
    } else if (transactionType === 'withdraw') {
      handleWithdrawal(values);
    }
  }

  const currentBalance = user?.walletBalance?.toFixed(2) ?? "0.00";

  return (
    <div className="container mx-auto">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet /> Partner Wallet
          </CardTitle>
          <CardDescription>Your current account balance and transaction options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-4xl font-bold tracking-tight">₹{currentBalance}</p>
          </div>
          
          {!transactionType ? (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button onClick={() => setTransactionType("deposit")} size="lg">
                <Landmark className="mr-2" /> Deposit
              </Button>
              <Button onClick={() => setTransactionType("withdraw")} variant="secondary" size="lg">
                <ArrowLeftRight className="mr-2" /> Withdraw
              </Button>
            </div>
          ) : (
            <div className="animate-in fade-in-50 duration-300">
              <h3 className="text-lg font-medium text-center mb-4 capitalize">{transactionType} Funds</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              step="1"
                              placeholder="0"
                              {...field}
                              className="pl-7"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <CardFooter className="p-0 pt-2 flex-col sm:flex-row gap-2">
                     <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        `Confirm ${transactionType}`
                      )}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => { setTransactionType(null); form.reset(); }}>
                      Cancel
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={stagedAmount !== null} onOpenChange={(isOpen) => !isOpen && setStagedAmount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              You are depositing <span className="font-bold">₹{stagedAmount}</span>. Select a method to complete the payment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button variant="outline" className="h-16 justify-start gap-4" onClick={handleFinalizeDeposit} disabled={isProcessing}>
               {isProcessing ? <Loader2 className="animate-spin" /> : <Image src="https://placehold.co/40x40?text=P" alt="Paytm Logo" width={40} height={40} />}
              <span className="text-lg font-semibold">Pay with Paytm</span>
            </Button>
            <Button variant="outline" className="h-16 justify-start gap-4" onClick={handleFinalizeDeposit} disabled={isProcessing}>
               {isProcessing ? <Loader2 className="animate-spin" /> : <Image src="https://placehold.co/40x40?text=G" alt="Google Pay Logo" width={40} height={40} />}
              <span className="text-lg font-semibold">Pay with Google Pay</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

