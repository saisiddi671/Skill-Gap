import DashboardLayout from "@/components/layout/DashboardLayout";
import ProgressStatsCards from "@/components/progress/ProgressStatsCards";
import AssessmentHistory from "@/components/progress/AssessmentHistory";
import SkillsOverview from "@/components/progress/SkillsOverview";
import ScoreChart from "@/components/progress/ScoreChart";
import SkillDistributionChart from "@/components/progress/SkillDistributionChart";
import { useProgressData } from "@/hooks/useProgressData";

const Progress = () => {
  const { assessmentResults, adaptiveResults, userSkills, stats, loading } = useProgressData();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Progress Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your learning journey, assessment scores, and skill growth
          </p>
        </div>

        <ProgressStatsCards stats={stats} loading={loading} />

        <div className="grid gap-6 lg:grid-cols-2">
          <ScoreChart
            assessmentResults={assessmentResults}
            adaptiveResults={adaptiveResults}
            loading={loading}
          />
          <SkillDistributionChart stats={stats} loading={loading} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AssessmentHistory
            assessmentResults={assessmentResults}
            adaptiveResults={adaptiveResults}
            loading={loading}
          />
          <SkillsOverview userSkills={userSkills} loading={loading} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Progress;
