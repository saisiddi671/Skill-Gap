import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Route, Plus, Pencil, Trash2, GripVertical, BookOpen, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { LearningPath, LearningModule, LearningLesson } from "@/hooks/useLearningPaths";

interface Skill {
  id: string;
  name: string;
}

const AdminLearningPaths = () => {
  const { toast } = useToast();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Path dialog
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);
  const [pathForm, setPathForm] = useState({
    title: "", description: "", skill_id: "", difficulty_start: "beginner",
    difficulty_end: "advanced", estimated_hours: "", is_published: false,
  });

  // Module dialog
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<LearningModule | null>(null);
  const [moduleParentPathId, setModuleParentPathId] = useState("");
  const [moduleForm, setModuleForm] = useState({
    title: "", description: "", difficulty: "beginner", order_index: 0,
  });

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LearningLesson | null>(null);
  const [lessonParentModuleId, setLessonParentModuleId] = useState("");
  const [lessonForm, setLessonForm] = useState({
    title: "", content: "", order_index: 0, estimated_minutes: "10",
  });

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [pathsRes, skillsRes] = await Promise.all([
      supabase.from("learning_paths")
        .select("*, skills(name, category)")
        .order("created_at", { ascending: false }),
      supabase.from("skills").select("id, name").order("name"),
    ]);

    if (pathsRes.data) {
      // Fetch modules and lessons for each path
      const pathIds = pathsRes.data.map((p: any) => p.id);
      const { data: modules } = await supabase
        .from("learning_modules")
        .select("*")
        .in("path_id", pathIds)
        .order("order_index");

      const moduleIds = (modules || []).map((m: any) => m.id);
      const { data: lessons } = moduleIds.length > 0
        ? await supabase.from("learning_lessons").select("*").in("module_id", moduleIds).order("order_index")
        : { data: [] };

      const enriched = pathsRes.data.map((p: any) => ({
        ...p,
        modules: (modules || [])
          .filter((m: any) => m.path_id === p.id)
          .map((m: any) => ({
            ...m,
            lessons: (lessons || []).filter((l: any) => l.module_id === m.id),
          })),
      }));

      setPaths(enriched as unknown as LearningPath[]);
    }

    setSkills(skillsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Path CRUD
  const openCreatePath = () => {
    setEditingPath(null);
    setPathForm({ title: "", description: "", skill_id: "", difficulty_start: "beginner", difficulty_end: "advanced", estimated_hours: "", is_published: false });
    setPathDialogOpen(true);
  };

  const openEditPath = (p: LearningPath) => {
    setEditingPath(p);
    setPathForm({
      title: p.title, description: p.description || "", skill_id: p.skill_id || "",
      difficulty_start: p.difficulty_start, difficulty_end: p.difficulty_end,
      estimated_hours: p.estimated_hours?.toString() || "", is_published: p.is_published,
    });
    setPathDialogOpen(true);
  };

  const handleSavePath = async () => {
    if (!pathForm.title) return;
    setSaving(true);
    try {
      const payload = {
        title: pathForm.title,
        description: pathForm.description || null,
        skill_id: pathForm.skill_id || null,
        difficulty_start: pathForm.difficulty_start,
        difficulty_end: pathForm.difficulty_end,
        estimated_hours: pathForm.estimated_hours ? Number(pathForm.estimated_hours) : null,
        is_published: pathForm.is_published,
      };
      if (editingPath) {
        const { error } = await supabase.from("learning_paths").update(payload).eq("id", editingPath.id);
        if (error) throw error;
        toast({ title: "Learning path updated" });
      } else {
        const { error } = await supabase.from("learning_paths").insert(payload);
        if (error) throw error;
        toast({ title: "Learning path created" });
      }
      setPathDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDeletePath = async (id: string) => {
    const { error } = await supabase.from("learning_paths").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Path deleted" }); fetchData(); }
  };

  // Module CRUD
  const openCreateModule = (pathId: string, existingCount: number) => {
    setEditingModule(null);
    setModuleParentPathId(pathId);
    setModuleForm({ title: "", description: "", difficulty: "beginner", order_index: existingCount });
    setModuleDialogOpen(true);
  };

  const openEditModule = (m: LearningModule) => {
    setEditingModule(m);
    setModuleParentPathId(m.path_id);
    setModuleForm({ title: m.title, description: m.description || "", difficulty: m.difficulty, order_index: m.order_index });
    setModuleDialogOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleForm.title) return;
    setSaving(true);
    try {
      const payload = {
        path_id: moduleParentPathId,
        title: moduleForm.title,
        description: moduleForm.description || null,
        difficulty: moduleForm.difficulty,
        order_index: moduleForm.order_index,
      };
      if (editingModule) {
        const { error } = await supabase.from("learning_modules").update(payload).eq("id", editingModule.id);
        if (error) throw error;
        toast({ title: "Module updated" });
      } else {
        const { error } = await supabase.from("learning_modules").insert(payload);
        if (error) throw error;
        toast({ title: "Module added" });
      }
      setModuleDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDeleteModule = async (id: string) => {
    const { error } = await supabase.from("learning_modules").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Module deleted" }); fetchData(); }
  };

  // Lesson CRUD
  const openCreateLesson = (moduleId: string, existingCount: number) => {
    setEditingLesson(null);
    setLessonParentModuleId(moduleId);
    setLessonForm({ title: "", content: "", order_index: existingCount, estimated_minutes: "10" });
    setLessonDialogOpen(true);
  };

  const openEditLesson = (l: LearningLesson) => {
    setEditingLesson(l);
    setLessonParentModuleId(l.module_id);
    setLessonForm({
      title: l.title, content: l.content, order_index: l.order_index,
      estimated_minutes: l.estimated_minutes?.toString() || "10",
    });
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title) return;
    setSaving(true);
    try {
      const payload = {
        module_id: lessonParentModuleId,
        title: lessonForm.title,
        content: lessonForm.content,
        order_index: lessonForm.order_index,
        estimated_minutes: Number(lessonForm.estimated_minutes) || 10,
      };
      if (editingLesson) {
        const { error } = await supabase.from("learning_lessons").update(payload).eq("id", editingLesson.id);
        if (error) throw error;
        toast({ title: "Lesson updated" });
      } else {
        const { error } = await supabase.from("learning_lessons").insert(payload);
        if (error) throw error;
        toast({ title: "Lesson added" });
      }
      setLessonDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDeleteLesson = async (id: string) => {
    const { error } = await supabase.from("learning_lessons").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Lesson deleted" }); fetchData(); }
  };

  const difficultyColor: Record<string, string> = {
    beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Learning Paths</h1>
            <p className="text-muted-foreground mt-1">Create structured courses from basics to advanced</p>
          </div>
          <Button onClick={openCreatePath} className="gap-2">
            <Plus className="h-4 w-4" /> New Learning Path
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : paths.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Route className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No learning paths yet</h3>
              <p className="text-muted-foreground">Create your first learning path to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paths.map(path => (
              <Card key={path.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{path.title}</CardTitle>
                        {path.is_published ? (
                          <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            <Eye className="h-3 w-3" /> Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <EyeOff className="h-3 w-3" /> Draft
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{path.description}</CardDescription>
                      <div className="flex gap-2 mt-2">
                        {path.skills && <Badge variant="outline">{(path.skills as any).name}</Badge>}
                        <Badge className={difficultyColor[path.difficulty_start]}>
                          {path.difficulty_start} → {path.difficulty_end}
                        </Badge>
                        {path.estimated_hours && (
                          <Badge variant="outline">{path.estimated_hours}h</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditPath(path)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePath(path.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        Modules ({path.modules?.length || 0})
                      </h4>
                      <Button variant="outline" size="sm" onClick={() => openCreateModule(path.id, path.modules?.length || 0)} className="gap-1">
                        <Plus className="h-3 w-3" /> Add Module
                      </Button>
                    </div>

                    {path.modules && path.modules.length > 0 && (
                      <Accordion type="multiple" className="w-full">
                        {path.modules.map((mod, mi) => (
                          <AccordionItem key={mod.id} value={mod.id}>
                            <AccordionTrigger className="hover:no-underline py-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">{mi + 1}.</span>
                                <span className="font-medium">{mod.title}</span>
                                <Badge variant="outline" className="text-xs">{mod.difficulty}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  ({mod.lessons?.length || 0} lessons)
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pl-4 space-y-2">
                                <div className="flex gap-1 mb-2">
                                  <Button variant="ghost" size="sm" onClick={() => openEditModule(mod)} className="gap-1 text-xs">
                                    <Pencil className="h-3 w-3" /> Edit Module
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteModule(mod.id)} className="gap-1 text-xs text-destructive">
                                    <Trash2 className="h-3 w-3" /> Delete
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => openCreateLesson(mod.id, mod.lessons?.length || 0)} className="gap-1 text-xs ml-auto">
                                    <Plus className="h-3 w-3" /> Add Lesson
                                  </Button>
                                </div>

                                {mod.lessons?.map((lesson, li) => (
                                  <div key={lesson.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                    <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="text-sm flex-1">{li + 1}. {lesson.title}</span>
                                    {lesson.estimated_minutes && (
                                      <span className="text-xs text-muted-foreground">{lesson.estimated_minutes}m</span>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditLesson(lesson)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteLesson(lesson.id)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Path Dialog */}
        <Dialog open={pathDialogOpen} onOpenChange={setPathDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPath ? "Edit Learning Path" : "Create Learning Path"}</DialogTitle>
              <DialogDescription>Define a structured learning journey from basics to advanced.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={pathForm.title} onChange={e => setPathForm({ ...pathForm, title: e.target.value })} placeholder="e.g. React Mastery Path" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={pathForm.description} onChange={e => setPathForm({ ...pathForm, description: e.target.value })} placeholder="What will learners achieve?" />
              </div>
              <div>
                <Label>Linked Skill</Label>
                <Select value={pathForm.skill_id} onValueChange={v => setPathForm({ ...pathForm, skill_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select skill (optional)" /></SelectTrigger>
                  <SelectContent>
                    {skills.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Level</Label>
                  <Select value={pathForm.difficulty_start} onValueChange={v => setPathForm({ ...pathForm, difficulty_start: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>End Level</Label>
                  <Select value={pathForm.difficulty_end} onValueChange={v => setPathForm({ ...pathForm, difficulty_end: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Estimated Hours</Label>
                <Input type="number" value={pathForm.estimated_hours} onChange={e => setPathForm({ ...pathForm, estimated_hours: e.target.value })} placeholder="e.g. 40" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={pathForm.is_published} onCheckedChange={v => setPathForm({ ...pathForm, is_published: v })} />
                <Label>Publish (visible to students)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPathDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePath} disabled={saving || !pathForm.title}>
                {saving ? "Saving..." : editingPath ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Module Dialog */}
        <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingModule ? "Edit Module" : "Add Module"}</DialogTitle>
              <DialogDescription>A module is a chapter within the learning path.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={moduleForm.title} onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })} placeholder="e.g. Getting Started with React" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={moduleForm.description} onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })} placeholder="Brief overview of this module" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Difficulty</Label>
                  <Select value={moduleForm.difficulty} onValueChange={v => setModuleForm({ ...moduleForm, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Order</Label>
                  <Input type="number" value={moduleForm.order_index} onChange={e => setModuleForm({ ...moduleForm, order_index: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveModule} disabled={saving || !moduleForm.title}>
                {saving ? "Saving..." : editingModule ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lesson Dialog */}
        <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
              <DialogDescription>Write the lesson content using Markdown formatting.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="e.g. What is JSX?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order</Label>
                  <Input type="number" value={lessonForm.order_index} onChange={e => setLessonForm({ ...lessonForm, order_index: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Est. Minutes</Label>
                  <Input type="number" value={lessonForm.estimated_minutes} onChange={e => setLessonForm({ ...lessonForm, estimated_minutes: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Content (Markdown supported)</Label>
                <Textarea
                  value={lessonForm.content}
                  onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })}
                  placeholder={"# Introduction\n\nWrite your lesson content here...\n\n```javascript\nconsole.log('Hello World');\n```"}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveLesson} disabled={saving || !lessonForm.title}>
                {saving ? "Saving..." : editingLesson ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminLearningPaths;
