import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Route, BookOpen, CheckCircle2, Circle, Clock, ArrowLeft, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

interface PathData {
  id: string;
  title: string;
  description: string | null;
  difficulty_start: string;
  difficulty_end: string;
  estimated_hours: number | null;
  skills?: { name: string } | null;
  modules: {
    id: string;
    title: string;
    description: string | null;
    difficulty: string;
    order_index: number;
    lessons: {
      id: string;
      title: string;
      content: string;
      order_index: number;
      estimated_minutes: number | null;
    }[];
  }[];
}

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const LearningPathDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [path, setPath] = useState<PathData | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPath = async () => {
    if (!id) return;

    const { data: pathData } = await supabase
      .from("learning_paths")
      .select("*, skills(name)")
      .eq("id", id)
      .single();

    if (!pathData) { setLoading(false); return; }

    const { data: modules } = await supabase
      .from("learning_modules")
      .select("*")
      .eq("path_id", id)
      .order("order_index");

    const moduleIds = (modules || []).map(m => m.id);
    const { data: lessons } = moduleIds.length > 0
      ? await supabase.from("learning_lessons").select("*").in("module_id", moduleIds).order("order_index")
      : { data: [] };

    const enriched: PathData = {
      ...pathData,
      skills: pathData.skills as any,
      modules: (modules || []).map(m => ({
        ...m,
        lessons: (lessons || []).filter(l => l.module_id === m.id),
      })),
    };

    setPath(enriched);

    // Fetch progress
    if (user) {
      const { data: progressData } = await supabase
        .from("user_learning_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("path_id", id);
      setCompletedLessons(new Set((progressData || []).map(p => p.lesson_id)));
    }

    // Set first incomplete lesson as active
    const allLessons = enriched.modules.flatMap(m => m.lessons);
    if (user) {
      const completedIds = new Set((await supabase
        .from("user_learning_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("path_id", id)).data?.map(p => p.lesson_id) || []);
      const nextLesson = allLessons.find(l => !completedIds.has(l.id));
      setActiveLessonId(nextLesson?.id || allLessons[0]?.id || null);
    } else {
      setActiveLessonId(allLessons[0]?.id || null);
    }

    setLoading(false);
  };

  useEffect(() => { fetchPath(); }, [id, user]);

  const toggleLessonComplete = async (lessonId: string) => {
    if (!user || !id) return;
    const isCompleted = completedLessons.has(lessonId);
    
    if (isCompleted) {
      await supabase.from("user_learning_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);
      setCompletedLessons(prev => { const s = new Set(prev); s.delete(lessonId); return s; });
    } else {
      await supabase.from("user_learning_progress")
        .upsert({ user_id: user.id, lesson_id: lessonId, path_id: id });
      setCompletedLessons(prev => new Set(prev).add(lessonId));
      toast({ title: "Lesson completed! 🎉" });
    }
  };

  const activeLesson = path?.modules.flatMap(m => m.lessons).find(l => l.id === activeLessonId);
  const allLessons = path?.modules.flatMap(m => m.lessons) || [];
  const totalLessons = allLessons.length;
  const completedCount = completedLessons.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Find next lesson
  const currentIndex = allLessons.findIndex(l => l.id === activeLessonId);
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!path) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Route className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Learning path not found</h2>
          <Button asChild className="mt-4"><Link to="/learning-paths">Back to Paths</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" asChild className="mb-2 gap-1 -ml-2">
            <Link to="/learning-paths"><ArrowLeft className="h-4 w-4" /> Back to Learning Paths</Link>
          </Button>
          <h1 className="text-3xl font-bold text-foreground">{path.title}</h1>
          {path.description && <p className="text-muted-foreground mt-1">{path.description}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            {path.skills && <Badge variant="outline">{(path.skills as any).name}</Badge>}
            <Badge className={difficultyColor[path.difficulty_start]}>
              {path.difficulty_start} → {path.difficulty_end}
            </Badge>
            {path.estimated_hours && (
              <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {path.estimated_hours}h total</Badge>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{completedCount}/{totalLessons} lessons completed</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar - Module/Lesson navigation */}
          <Card className="h-fit lg:sticky lg:top-24">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Course Content</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Accordion type="multiple" defaultValue={path.modules.map(m => m.id)} className="w-full">
                {path.modules.map((mod, mi) => (
                  <AccordionItem key={mod.id} value={mod.id} className="border-b-0">
                    <AccordionTrigger className="px-4 py-2 hover:no-underline text-sm">
                      <div className="flex items-center gap-2 text-left">
                        <span className="text-muted-foreground text-xs font-bold">{mi + 1}</span>
                        <span className="font-medium">{mod.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <div className="space-y-0.5 px-2 pb-2">
                        {mod.lessons.map((lesson, li) => {
                          const isCompleted = completedLessons.has(lesson.id);
                          const isActive = lesson.id === activeLessonId;
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setActiveLessonId(lesson.id)}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-left transition-colors ${
                                isActive
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "hover:bg-muted text-muted-foreground"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 shrink-0" />
                              )}
                              <span className="truncate">{lesson.title}</span>
                              {lesson.estimated_minutes && (
                                <span className="text-xs text-muted-foreground ml-auto shrink-0">{lesson.estimated_minutes}m</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Main lesson content */}
          <div className="space-y-4">
            {activeLesson ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{activeLesson.title}</CardTitle>
                      {activeLesson.estimated_minutes && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" /> {activeLesson.estimated_minutes} min
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{activeLesson.content}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation + Complete */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    {prevLesson && (
                      <Button variant="outline" onClick={() => setActiveLessonId(prevLesson.id)} className="gap-1">
                        <ArrowLeft className="h-4 w-4" /> Previous
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={completedLessons.has(activeLesson.id) ? "secondary" : "default"}
                      onClick={() => toggleLessonComplete(activeLesson.id)}
                      className="gap-2"
                    >
                      {completedLessons.has(activeLesson.id) ? (
                        <><CheckCircle2 className="h-4 w-4" /> Completed</>
                      ) : (
                        <><Circle className="h-4 w-4" /> Mark Complete</>
                      )}
                    </Button>
                    {nextLesson && (
                      <Button onClick={() => { 
                        if (!completedLessons.has(activeLesson.id)) toggleLessonComplete(activeLesson.id);
                        setActiveLessonId(nextLesson.id); 
                      }} className="gap-1">
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No lessons in this path yet</h3>
                  <p className="text-muted-foreground">Lessons will appear here once added by the admin.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LearningPathDetail;
