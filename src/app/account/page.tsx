
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

export default function AccountPage() {
  return (
    <div className="container mx-auto">
       <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User /> Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This is where user account details and settings will be displayed.</p>
        </CardContent>
      </Card>
    </div>
  );
}
