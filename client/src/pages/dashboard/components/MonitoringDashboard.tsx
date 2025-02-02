import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Outlier = {
  id: number;
  patientId: string;
  message: string;
  createdAt: string;
  reportedDate: string;
  type: string;
};

// Fixed thresholds
const THRESHOLDS = {
  LDL: 200,
  GLUCOSE: 250,
  SEVERITY: 8
};

function getReferenceRange(testType: string): string {
  switch (testType) {
    case 'LDL':
      return `< ${THRESHOLDS.LDL} mg/dL`;
    case 'Glucose':
      return `< ${THRESHOLDS.GLUCOSE} mg/dL`;
    default:
      return '';
  }
}

function getSeverityFromMessage(message: string): number | null {
  // Updated regex to handle both formats
  const severityMatch = message.match(/severity[^0-9]*([0-9]+)/i);
  if (severityMatch) {
    return parseInt(severityMatch[1]);
  }
  return null;
}

function getSymptomFromMessage(message: string): string | null {
  // Extract symptom name from the message
  const symptomMatch = message.match(/Symptom:\s*([^,(]+)/i);
  if (symptomMatch) {
    return symptomMatch[1].trim();
  }
  return null;
}

function formatMessage(outlier: Outlier): string {
  if (outlier.type === 'symptom') {
    const symptom = getSymptomFromMessage(outlier.message);
    const severity = getSeverityFromMessage(outlier.message);
    if (symptom) {
      return `Symptom: ${symptom}`;
    }
  }
  return outlier.message;
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

function isAbnormalValue(outlier: Outlier): boolean {
  if (outlier.type === 'symptom') {
    const severity = getSeverityFromMessage(outlier.message);
    return severity !== null && severity >= THRESHOLDS.SEVERITY;
  }

  if (outlier.type === 'lab') {
    const labDetails = getLabDetails(outlier.message);
    if (labDetails) {
      const value = parseInt(labDetails.value);
      return labDetails.type === 'LDL' 
        ? value > THRESHOLDS.LDL 
        : value > THRESHOLDS.GLUCOSE;
    }
  }

  return false;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export default function MonitoringDashboard() {
  const { data: initialOutliers } = useQuery<Outlier[]>({
    queryKey: ["/api/outliers"],
  });

  const realtimeOutliers = useWebSocket<Outlier>();
  const allOutliers = [...realtimeOutliers, ...(initialOutliers || [])];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Monitoring Dashboard
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time monitoring of transformation logs and outlier events. 
            Outliers are highlighted when: LDL{`>`}200 or Glucose{`>`}250 ⟹ outlier, and symptom severity{`≥`}8
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px]">
          {allOutliers.length > 0 ? (
            <div className="space-y-4">
              {allOutliers.map((outlier, index) => {
                const isAbnormal = isAbnormalValue(outlier);
                const severity = getSeverityFromMessage(outlier.message);
                const uniqueKey = `${outlier.id}-${outlier.type}-${index}`; //Improved key generation
                return (
                  <div
                    key={uniqueKey}
                    className={`p-4 border rounded-lg transition-colors ${
                      isAbnormal ? 'bg-destructive/5 border-destructive/50' : 'bg-background/50'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">
                          Patient {outlier.patientId}
                        </span>
                        <div className="mt-2">
                          <p className="text-sm">
                            {formatMessage(outlier)}
                            {outlier.type === 'symptom' && severity !== null && (
                              <span className="text-sm">, Severity: {severity}</span>
                            )}
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
                          <Badge variant={isAbnormal ? "destructive" : "secondary"}>
                            {outlier.type === 'symptom' ? (
                              `Severity: ${severity !== null ? severity : 'Unknown'}`
                            ) : outlier.type === 'lab' ? (
                              `Value: ${getLabDetails(outlier.message)?.value} mg/dL`
                            ) : (
                              outlier.type
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Events</h3>
              <p className="text-sm text-muted-foreground">
                No transformation logs or outlier events have been recorded yet.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}