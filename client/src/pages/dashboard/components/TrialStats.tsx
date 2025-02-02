import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, AlertTriangle } from "lucide-react";

type Stats = {
  patientCount: number;
  avgSeverity: number;
  outlierCount: number;
};

function StatCard({
  icon,
  label,
  value,
  description
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export default function TrialStats({ stats }: { stats?: Stats }) {
  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trial Statistics</CardTitle>
        <p className="text-sm text-muted-foreground">
          Overview of patient enrollment, symptom severity, and detected outliers in the clinical trial
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Total Patients"
            description="Number of enrolled patients"
            value={stats.patientCount}
          />
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Avg. Symptom Severity"
            description="Average severity score (scale: 0-10)"
            value={stats.avgSeverity.toFixed(1)}
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Total Outliers"
            description="Count of detected abnormal values"
            value={stats.outlierCount}
          />
        </div>
      </CardContent>
    </Card>
  );
}