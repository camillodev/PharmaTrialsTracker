import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataUpload from "./components/DataUpload";
import MonitoringDashboard from "./components/MonitoringDashboard";
import TrialStats from "./components/TrialStats";
import TrialSummary from "./components/TrialSummary";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["/api/analysis"],
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
            Clinical Trial Dashboard
          </h1>
          <DataUpload />
        </div>

        {/* Trial Statistics */}
        <div className="w-full">
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <TrialStats stats={analysis?.stats} />
          )}
        </div>

        {/* Monitoring Dashboard */}
        <div className="w-full">
          <MonitoringDashboard />
        </div>

        {/* AI Analysis */}
        <div className="w-full">
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <TrialSummary summary={analysis?.summary} stats={analysis?.stats} />
          )}
        </div>
      </div>
    </div>
  );
}