import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Summary = {
  summary: string;
  riskLevel: string;
};

type Props = {
  summary?: Summary;
  stats?: {
    patientCount: number;
    avgSeverity: number;
    outlierCount: number;
  };
};

export default function TrialSummary({ summary, stats }: Props) {
  // Check if we have any actual data
  const hasData = stats && (stats.patientCount > 0 || stats.avgSeverity > 0 || stats.outlierCount > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData && summary ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Risk Level:</span>
              <Badge variant={getRiskVariant(summary.riskLevel)}>
                {summary.riskLevel.toUpperCase()}
              </Badge>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Key Findings</h3>
              <div className="prose prose-sm text-muted-foreground">
                {summary.summary.split('. ').map((sentence, i) => (
                  <p key={i} className="text-sm leading-relaxed">
                    • {sentence}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Upload trial data to receive AI-powered insights about the clinical trial progress and risk assessment.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getRiskVariant(risk: string): "default" | "secondary" | "destructive" {
  switch (risk?.toLowerCase()) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'default';
    default:
      return 'secondary';
  }
}