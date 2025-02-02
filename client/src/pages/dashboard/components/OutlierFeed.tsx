import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Outlier = {
  id: number;
  patientId: string;
  message: string;
  createdAt: string;
  reportedDate: string;
  type: string;
};

function getReferenceRange(testType: string): string {
  switch (testType) {
    case 'LDL':
      return '< 200 mg/dL';
    case 'Glucose':
      return '< 250 mg/dL';
    default:
      return '';
  }
}

function getSeverityFromMessage(message: string): number | null {
  const severityMatch = message.match(/severity \((\d+)\)/);
  if (severityMatch) {
    return parseInt(severityMatch[1]);
  }
  return null;
}

function getLabDetails(message: string): { type: string, value: string } | null {
  const labMatch = message.match(/(\w+): (\d+) /);
  if (labMatch) {
    return {
      type: labMatch[1],
      value: labMatch[2]
    };
  }
  return null;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export default function OutlierFeed() {
  const [severityFilter, setSeverityFilter] = useState("8");
  const { data: initialOutliers } = useQuery<Outlier[]>({
    queryKey: ["/api/outliers"],
  });

  const realtimeOutliers = useWebSocket<Outlier>();
  const allOutliers = [...realtimeOutliers, ...(initialOutliers || [])];

  const filteredOutliers = allOutliers.filter(outlier => {
    if (outlier.type === 'symptom') {
      const severity = getSeverityFromMessage(outlier.message);
      return severity !== null && severity >= parseInt(severityFilter);
    }

    if (outlier.type === 'lab') {
      const labDetails = getLabDetails(outlier.message);
      if (labDetails) {
        const value = parseInt(labDetails.value);
        return labDetails.type === 'LDL' ? value > 200 : value > 250;
      }
    }

    return true; // Show other types of outliers (like enrollment or reference)
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Outlier Feed
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time monitoring of abnormal lab results (LDL {`>`} 200 mg/dL, Glucose {`>`} 250 mg/dL) and severe symptoms (severity scale: 0-10)
        </p>
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Minimum Symptom Severity:</span>
            <Select
              value={severityFilter}
              onValueChange={setSeverityFilter}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {filteredOutliers.length > 0 ? (
            <div className="space-y-4">
              {filteredOutliers.map((outlier) => (
                <div
                  key={outlier.id}
                  className="p-4 border rounded-lg bg-background/50"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">
                        Patient {outlier.patientId}
                      </span>
                      <div className="mt-2">
                        <p className="text-sm">
                          {outlier.message}
                        </p>
                        {outlier.type === 'lab' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reference: {getReferenceRange(getLabDetails(outlier.message)?.type || '')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(outlier.reportedDate)}
                      </span>
                      <div className="mt-2">
                        <Badge variant="destructive">
                          {outlier.type === 'symptom' ? (
                            `Severity: ${getSeverityFromMessage(outlier.message)}`
                          ) : (
                            `Value: ${getLabDetails(outlier.message)?.value} mg/dL`
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Matching Outliers</h3>
              <p className="text-sm text-muted-foreground">
                No outliers found matching the current severity filter or thresholds.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}