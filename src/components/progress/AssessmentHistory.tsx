import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, Trophy } from "lucide-react";
import { format } from "date-fns";
import type { AssessmentResult, AdaptiveResult } from "@/hooks/useProgressData";

interface AssessmentHistoryProps {
  assessmentResults: AssessmentResult[];
  adaptiveResults: AdaptiveResult[];
  loading: boolean;
}

const levelColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const getScoreColor = (percentage: number) => {
  if (percentage >= 80) return "text-green-600 dark:text-green-400";
  if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

const AssessmentHistory = ({ assessmentResults, adaptiveResults, loading }: AssessmentHistoryProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Combine and sort all results by date
  const allResults = [
    ...assessmentResults.map((r) => ({
      id: r.id,
      title: r.assessments.title,
      type: "Standard" as const,
      skill: r.assessments.skills?.name || "General",
      score: r.score,
      maxScore: r.max_score,
      percentage: r.percentage || Math.round((r.score / r.max_score) * 100),
      level: r.calculated_level,
      date: r.completed_at,
    })),
    ...adaptiveResults.map((r) => ({
      id: r.id,
      title: `Adaptive: ${r.skills.name}`,
      type: "Adaptive" as const,
      skill: r.skills.name,
      score: r.score || 0,
      maxScore: r.max_score || 0,
      percentage: r.percentage || 0,
      level: r.calculated_level,
      date: r.completed_at || "",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allResults.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No assessments completed yet</h3>
          <p className="text-muted-foreground max-w-md">
            Take an assessment to start tracking your progress and skill growth over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Assessment History
        </CardTitle>
        <CardDescription>Your completed assessments and scores</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allResults.map((result) => (
            <div
              key={result.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="space-y-1">
                <p className="font-medium text-sm">{result.title}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {result.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {result.skill}
                  </Badge>
                  {result.level && (
                    <Badge className={`text-xs ${levelColors[result.level.toLowerCase()] || "bg-muted"}`}>
                      {result.level}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right space-y-1">
                <p className={`text-lg font-bold ${getScoreColor(result.percentage)}`}>
                  {result.percentage}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.score}/{result.maxScore} • {format(new Date(result.date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentHistory;
