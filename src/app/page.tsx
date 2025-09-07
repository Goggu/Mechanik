
"use client";

import { useAuth } from "@/hooks/use-auth";
import { AlerterView } from "@/components/alerter-view";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto text-center flex-grow flex items-center justify-center">
      {user ? <AlerterView /> : null}
    </div>
  );
}
