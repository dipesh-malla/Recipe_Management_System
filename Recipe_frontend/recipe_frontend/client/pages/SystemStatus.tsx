import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const SystemStatus = () => {
  const checkBackend = useQuery({
    queryKey: ["backend-health"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8090/api/health");
      if (!response.ok) throw new Error("Backend not responding");
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
  });

  const checkMLBackend = useQuery({
    queryKey: ["ml-health"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/health");
      if (!response.ok) throw new Error("ML Backend not responding");
      return response.json();
    },
    refetchInterval: 30000,
    retry: 1,
  });

  const ServiceStatus = ({ 
    name, 
    query, 
    url 
  }: { 
    name: string; 
    query: any; 
    url: string;
  }) => {
    const getStatusIcon = () => {
      if (query.isLoading) {
        return <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />;
      }
      if (query.isError) {
        return <XCircle className="h-5 w-5 text-red-500" />;
      }
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    };

    const getStatusBadge = () => {
      if (query.isLoading) {
        return <Badge variant="outline" className="bg-yellow-50">Checking...</Badge>;
      }
      if (query.isError) {
        return <Badge variant="destructive">Offline</Badge>;
      }
      return <Badge className="bg-green-500">Online</Badge>;
    };

    return (
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-sm text-muted-foreground">{url}</p>
            {query.isError && (
              <p className="text-xs text-red-500 mt-1">
                {query.error?.message || "Service unavailable"}
              </p>
            )}
            {query.data && (
              <p className="text-xs text-green-600 mt-1">
                {query.data.message || "Service operational"}
              </p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Monitor the health and connectivity of all services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ServiceStatus
            name="Java Backend API"
            query={checkBackend}
            url="http://localhost:8090/api"
          />
          <ServiceStatus
            name="ML Backend API"
            query={checkMLBackend}
            url="http://localhost:8000/api"
          />
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Configuration</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• Java Backend: {import.meta.env.VITE_JAVA_API_URL || "http://localhost:8090/api"}</p>
              <p>• ML Backend: {import.meta.env.VITE_ML_API_URL || "http://localhost:8000/api"}</p>
              <p>• Environment: {import.meta.env.MODE}</p>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>Last checked: {new Date().toLocaleString()}</p>
            <p className="mt-1">Auto-refresh every 30 seconds</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemStatus;
