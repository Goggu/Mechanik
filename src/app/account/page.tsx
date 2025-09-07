
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
          <p className="text-muted-foreground">You are currently using the app as an anonymous user. There are no account details to display.</p>
        </CardContent>
      </Card>
    </div>
  );
}
