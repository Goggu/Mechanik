
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Wallet, Landmark, ArrowLeftRight, Loader2 } from "lucide-react";

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
    },
  });

  const handleTransaction = async (values: z.infer<typeof formSchema>) => {
    if (!user || !transactionType) return;

    const userRef = doc(db, "users", user.uid);
    const amount = values.amount;

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User document not found.");
        }

        const currentBalance = userDoc.data().walletBalance || 0;
        let newBalance = currentBalance;

        if (transactionType === "deposit") {
          newBalance += amount;
        } else {
          if (currentBalance < amount) {
            throw new Error("Insufficient funds for withdrawal.");
          }
          newBalance -= amount;
        }

        transaction.update(userRef, { walletBalance: newBalance });
      });

      // Update local user state
      setUserData((prevUser) => prevUser ? { ...prevUser, walletBalance: (prevUser.walletBalance || 0) + (transactionType === 'deposit' ? amount : -amount) } : null);

      toast({
        title: "Transaction Successful",
        description: `Your new balance is ₹${((user.walletBalance || 0) + (transactionType === 'deposit' ? amount : -amount)).toFixed(2)}.`,
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
    }
  };

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
                <form onSubmit={form.handleSubmit(handleTransaction)} className="space-y-4">
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
    </div>
  );
}
