import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Route, Clock, BookOpen, ChevronRight, Filter, Layers } from "lucide-react";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { LearningModule, LearningLesson } from "@/hooks/useLearningPaths";

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const LearningPaths = () => {
  const { paths, progress, loading } = useLearningPaths();
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [pathDetails, setPathDetails] = useState<Record<string, { modules: LearningModule[] }>>({});

  // Fetch module/lesson counts for progress calculation
  useEffect(() => {
    const fetchDetails = async () => {
      if (paths.length === 0) return;
      const pathIds = paths.map(p => p.id);
      
      const { data: modules } = await supabase
        .from("learning_modules")
        .select("id, path_id, title, order_index, difficulty")
        .in("path_id", pathIds)
        .order("order_index");

      if (!modules || modules.length === 0) return;

      const moduleIds = modules.map(m => m.id);
      const { data: lessons } = await supabase
        .from("learning_lessons")
        .select("id, module_id, title, order_index, estimated_minutes")
        .in("module_id", moduleIds)
        .order("order_index");

      const details: Record<string, { modules: LearningModule[] }> = {};
      pathIds.forEach(pid => {
        const pathModules = (modules || [])
          .filter(m => m.path_id === pid)
          .map(m => ({
            ...m,
            description: null,
            lessons: (lessons || []).filter(l => l.module_id === m.id).map(l => ({
              ...l,
              content: "",
            })),
          }));
        details[pid] = { modules: pathModules };
      });

      setPathDetails(details);
    };
    fetchDetails();
  }, [paths]);

  const getPathProgress = (pathId: string) => {
    const detail = pathDetails[pathId];
    if (!detail) return 0;
    const totalLessons = detail.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
    if (totalLessons === 0) return 0;
    const completedLessons = progress.filter(p => p.path_id === pathId).length;
    return Math.round((completedLessons / totalLessons) * 100);
  };

  const getTotalLessons = (pathId: string) => {
    const detail = pathDetails[pathId];
    if (!detail) return 0;
    return detail.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  };

  const filteredPaths = filterDifficulty === "all"
    ? paths
    : paths.filter(p => p.difficulty_start === filterDifficulty);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Learning Paths</h1>
          <p className="text-muted-foreground mt-1">
            Structured courses from basics to advanced — learn at your own pace
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-20 w-full" /></CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPaths.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Route className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No learning paths available yet</h3>
              <p className="text-muted-foreground">Check back soon for structured learning content.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPaths.map(path => {
              const progressPct = getPathProgress(path.id);
              const totalLessons = getTotalLessons(path.id);
              const completedCount = progress.filter(p => p.path_id === path.id).length;

              return (
                <Card key={path.id} className="group hover:shadow-md transition-all flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Route className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{path.title}</CardTitle>
                      </div>
                    </div>
                    {path.description && (
                      <CardDescription className="line-clamp-2">{path.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {path.skills && (
                          <Badge variant="outline">{(path.skills as any).name}</Badge>
                        )}
                        <Badge className={difficultyColor[path.difficulty_start]}>
                          {path.difficulty_start} → {path.difficulty_end}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {path.estimated_hours && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {path.estimated_hours}h
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" /> {pathDetails[path.id]?.modules.length || 0} modules
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> {totalLessons} lessons
                        </span>
                      </div>

                      {totalLessons > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{completedCount}/{totalLessons} completed</span>
                            <span>{progressPct}%</span>
                          </div>
                          <Progress value={progressPct} className="h-2" />
                        </div>
                      )}
                    </div>

                    <Button asChild variant="outline" className="w-full gap-2">
                      <Link to={`/learning-paths/${path.id}`}>
                        {progressPct > 0 ? "Continue Learning" : "Start Learning"}
                        <ChevronRight className="h-4 w-4" />
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

export default LearningPaths;
