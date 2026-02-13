import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { AssessmentResult, AdaptiveResult } from "@/hooks/useProgressData";
import { format } from "date-fns";

interface ScoreChartProps {
  assessmentResults: AssessmentResult[];
  adaptiveResults: AdaptiveResult[];
  loading: boolean;
}

const getBarColor = (percentage: number) => {
  if (percentage >= 80) return "hsl(142, 76%, 36%)";
  if (percentage >= 60) return "hsl(38, 92%, 50%)";
  return "hsl(0, 84%, 60%)";
};

const ScoreChart = ({ assessmentResults, adaptiveResults, loading }: ScoreChartProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    ...assessmentResults.map((r) => ({
      name: r.assessments.title.length > 15
        ? r.assessments.title.slice(0, 15) + "…"
        : r.assessments.title,
      score: r.percentage || Math.round((r.score / r.max_score) * 100),
      date: format(new Date(r.completed_at), "MMM d"),
    })),
    ...adaptiveResults.map((r) => ({
      name: r.skills.name,
      score: r.percentage || 0,
      date: r.completed_at ? format(new Date(r.completed_at), "MMM d") : "",
    })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10); // Show last 10

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No score data yet</h3>
          <p className="text-muted-foreground">Complete assessments to see your score trends.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Score Trends
        </CardTitle>
        <CardDescription>Your recent assessment scores</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number) => [`${value}%`, "Score"]}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ScoreChart;
