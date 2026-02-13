import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";

const PendingApproval = () => {
  const { user, signOut, refreshApproval } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await refreshApproval();
    setChecking(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto p-4 bg-warning/10 rounded-full w-fit mb-4">
            <Clock className="h-10 w-10 text-warning" />
          </div>
          <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
          <CardDescription className="text-base">
            Your account has been created successfully, but it needs to be approved by an administrator before you can access the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Logged in as <span className="font-medium text-foreground">{user?.email}</span>
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleCheck} disabled={checking} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking..." : "Check Approval Status"}
            </Button>
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
