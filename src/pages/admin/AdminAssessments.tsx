import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClipboardCheck, Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AssessmentQuestionsManager from "@/components/admin/AssessmentQuestionsManager";

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  time_limit_minutes: number | null;
  is_active: boolean | null;
  skill_id: string | null;
  created_at: string;
  skills?: { name: string } | null;
}

interface Skill {
  id: string;
  name: string;
}

const AdminAssessments = () => {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "intermediate",
    time_limit_minutes: "30",
    is_active: true,
    skill_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [questionsAssessment, setQuestionsAssessment] = useState<Assessment | null>(null);

  const fetchData = async () => {
    const [assessmentsRes, skillsRes] = await Promise.all([
      supabase.from("assessments").select("*, skills (name)").order("created_at", { ascending: false }),
      supabase.from("skills").select("id, name").order("name"),
    ]);
    setAssessments((assessmentsRes.data as unknown as Assessment[]) || []);
    setSkills(skillsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", difficulty: "intermediate", time_limit_minutes: "30", is_active: true, skill_id: "" });
    setDialogOpen(true);
  };

  const openEdit = (a: Assessment) => {
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description || "",
      difficulty: a.difficulty || "intermediate",
      time_limit_minutes: String(a.time_limit_minutes || 30),
      is_active: a.is_active ?? true,
      skill_id: a.skill_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        difficulty: form.difficulty,
        time_limit_minutes: parseInt(form.time_limit_minutes) || 30,
        is_active: form.is_active,
        skill_id: form.skill_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("assessments").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Assessment updated successfully" });
      } else {
        const { error } = await supabase.from("assessments").insert(payload);
        if (error) throw error;
        toast({ title: "Assessment created successfully" });
      }
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Assessment deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error deleting assessment", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from("assessments").update({ is_active: !current }).eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const difficultyColors: Record<string, string> = {
    beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Assessments</h1>
            <p className="text-muted-foreground mt-1">Create and manage skill assessments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Assessment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Assessment" : "Create Assessment"}</DialogTitle>
                <DialogDescription>
                  {editing ? "Update assessment details." : "Fill in the details to create a new assessment."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. JavaScript Fundamentals" />
                </div>
                <div>
                  <Label htmlFor="skill">Linked Skill</Label>
                  <Select value={form.skill_id} onValueChange={(v) => setForm({ ...form, skill_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select skill (optional)" /></SelectTrigger>
                    <SelectContent>
                      {skills.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="time">Time Limit (minutes)</Label>
                  <Input id="time" type="number" value={form.time_limit_minutes} onChange={(e) => setForm({ ...form, time_limit_minutes: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.title}>
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Assessments ({assessments.length})
            </CardTitle>
            <CardDescription>All assessments on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : assessments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No assessments created</h3>
                <p className="text-muted-foreground">Create assessments to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Skill</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell>
                          {a.skills?.name ? <Badge variant="outline">{a.skills.name}</Badge> : "—"}
                        </TableCell>
                        <TableCell>
                          {a.difficulty && (
                            <Badge className={difficultyColors[a.difficulty] || "bg-muted"}>
                              {a.difficulty.charAt(0).toUpperCase() + a.difficulty.slice(1)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{a.time_limit_minutes || 30} min</TableCell>
                        <TableCell>
                          <Switch
                            checked={a.is_active ?? true}
                            onCheckedChange={() => toggleActive(a.id, a.is_active ?? true)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" title="Manage Questions" onClick={() => setQuestionsAssessment(a)}>
                              <ListChecks className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {questionsAssessment && (
        <AssessmentQuestionsManager
          assessmentId={questionsAssessment.id}
          assessmentTitle={questionsAssessment.title}
          open={!!questionsAssessment}
          onOpenChange={(open) => { if (!open) setQuestionsAssessment(null); }}
        />
      )}
    </DashboardLayout>
  );
};

export default AdminAssessments;
