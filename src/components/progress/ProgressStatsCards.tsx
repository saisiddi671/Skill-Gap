import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, TrendingUp, Target, Award, CalendarDays } from "lucide-react";
import type { ProgressStats } from "@/hooks/useProgressData";

interface ProgressStatsCardsProps {
  stats: ProgressStats;
  loading: boolean;
}

const ProgressStatsCards = ({ stats, loading }: ProgressStatsCardsProps) => {
  const cards = [
    {
      title: "Total Assessments",
      value: stats.totalAssessments,
      subtitle: "Completed",
      icon: ClipboardCheck,
    },
    {
      title: "Average Score",
      value: `${stats.averageScore}%`,
      subtitle: "Across all assessments",
      icon: TrendingUp,
    },
    {
      title: "Skills Tracked",
      value: stats.totalSkills,
      subtitle: "In your profile",
      icon: Target,
    },
    {
      title: "Highest Level",
      value: stats.highestLevel,
      subtitle: "Achieved proficiency",
      icon: Award,
    },
    {
      title: "This Month",
      value: stats.assessmentsThisMonth,
      subtitle: "Assessments completed",
      icon: CalendarDays,
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {cards.map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProgressStatsCards;
