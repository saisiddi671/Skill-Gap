import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, Clock, BarChart3, CheckCircle2, ArrowRight, Sparkles, Brain } from "lucide-react";

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  time_limit_minutes: number | null;
  skill_id: string | null;
  skills: { name: string; category: string } | null;
  assessment_questions: { points: number }[];
}

interface AssessmentResult {
  assessment_id: string;
  score: number;
  max_score: number;
  percentage: number | null;
  calculated_level: string | null;
  completed_at: string;
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-600 border-green-500/20",
  intermediate: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  advanced: "bg-red-500/10 text-red-600 border-red-500/20",
};

const Assessments = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<Record<string, AssessmentResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active assessments
        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from("assessments")
          .select(`
            id,
            title,
            description,
            difficulty,
            time_limit_minutes,
            skill_id,
            skills (name, category),
            assessment_questions (points)
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (assessmentsError) throw assessmentsError;
        setAssessments(assessmentsData || []);

        // Fetch user's assessment results
        const { data: resultsData, error: resultsError } = await supabase
          .from("assessment_results")
          .select("assessment_id, score, max_score, percentage, calculated_level, completed_at")
          .order("completed_at", { ascending: false });

        if (resultsError) throw resultsError;

        // Map results by assessment_id (most recent)
        const resultsMap: Record<string, AssessmentResult> = {};
        resultsData?.forEach((result) => {
          if (!resultsMap[result.assessment_id]) {
            resultsMap[result.assessment_id] = result;
          }
        });
        setResults(resultsMap);
      } catch (error) {
        console.error("Error fetching assessments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Skill Assessments</h1>
          <p className="text-muted-foreground mt-1">
            Test your skills and get accurate proficiency levels
          </p>
        </div>

        {/* AI-Powered Adaptive Assessment Banner */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">AI-Powered Adaptive Assessment</h3>
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    New
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get personalized questions based on your skill level with coding challenges
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/assessments/adaptive">
                Try Adaptive Test
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assessments.length}</p>
                <p className="text-sm text-muted-foreground">Available Tests</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(results).length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(results).length > 0
                    ? Math.round(
                        Object.values(results).reduce((sum, r) => sum + (r.percentage || 0), 0) /
                          Object.values(results).length
                      )
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Avg. Score</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessments Grid */}
        {assessments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No assessments available</p>
              <p className="text-muted-foreground">Check back later for new skill tests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assessments.map((assessment) => {
              const result = results[assessment.id];
              const isCompleted = !!result;
              const totalMarks = assessment.assessment_questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0;
              const questionCount = assessment.assessment_questions?.length || 0;

              return (
                <Card key={assessment.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        {assessment.skills && (
                          <Badge variant="outline" className="text-xs">
                            {assessment.skills.category}
                          </Badge>
                        )}
                        <CardTitle className="text-lg">{assessment.title}</CardTitle>
                      </div>
                      {isCompleted && (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {assessment.description || "Test your knowledge and skills"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {assessment.difficulty && (
                        <Badge variant="outline" className={difficultyColors[assessment.difficulty]}>
                          {assessment.difficulty}
                        </Badge>
                      )}
                      {assessment.time_limit_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {assessment.time_limit_minutes} min
                        </span>
                      )}
                      {questionCount > 0 && (
                        <span className="flex items-center gap-1">
                          {questionCount} Q • {totalMarks} marks
                        </span>
                      )}
                    </div>

                    {isCompleted && result && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Last Score</span>
                          <span className="font-medium">
                            {result.score}/{result.max_score} ({result.percentage}%)
                          </span>
                        </div>
                        {result.calculated_level && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Level</span>
                            <Badge variant="secondary">{result.calculated_level}</Badge>
                          </div>
                        )}
                      </div>
                    )}

                    <Button asChild className="w-full group-hover:bg-primary">
                      <Link to={`/assessments/${assessment.id}`}>
                        {isCompleted ? "Retake Assessment" : "Start Assessment"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Assessments;