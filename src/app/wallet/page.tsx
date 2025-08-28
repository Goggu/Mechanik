
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function WalletPage() {
  return (
    <div className="container mx-auto">
       <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet /> Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This is where partner wallet information will be displayed.</p>
        </CardContent>
      </Card>
    </div>
  );
}
