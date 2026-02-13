import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  provider: string | null;
  url: string | null;
  difficulty: string | null;
  duration: string | null;
  is_free: boolean | null;
  skill_id: string | null;
  skills?: { name: string } | null;
}

interface Skill {
  id: string;
  name: string;
}

const RESOURCE_TYPES = ["course", "tutorial", "book", "documentation", "certification", "video", "article"];

const AdminRecommendations = () => {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Recommendation | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    resource_type: "course",
    provider: "",
    url: "",
    difficulty: "beginner",
    duration: "",
    is_free: true,
    skill_id: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [recsRes, skillsRes] = await Promise.all([
      supabase.from("recommendations").select("*, skills (name)").order("created_at", { ascending: false }),
      supabase.from("skills").select("id, name").order("name"),
    ]);
    setRecommendations((recsRes.data as unknown as Recommendation[]) || []);
    setSkills(skillsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", resource_type: "course", provider: "", url: "", difficulty: "beginner", duration: "", is_free: true, skill_id: "" });
    setDialogOpen(true);
  };

  const openEdit = (rec: Recommendation) => {
    setEditing(rec);
    setForm({
      title: rec.title,
      description: rec.description || "",
      resource_type: rec.resource_type,
      provider: rec.provider || "",
      url: rec.url || "",
      difficulty: rec.difficulty || "beginner",
      duration: rec.duration || "",
      is_free: rec.is_free ?? true,
      skill_id: rec.skill_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.resource_type) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        resource_type: form.resource_type,
        provider: form.provider || null,
        url: form.url || null,
        difficulty: form.difficulty || null,
        duration: form.duration || null,
        is_free: form.is_free,
        skill_id: form.skill_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("recommendations").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Recommendation updated successfully" });
      } else {
        const { error } = await supabase.from("recommendations").insert(payload);
        if (error) throw error;
        toast({ title: "Recommendation created successfully" });
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
      const { error } = await supabase.from("recommendations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Recommendation deleted" });
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
            <h1 className="text-3xl font-bold text-foreground">Manage Recommendations</h1>
            <p className="text-muted-foreground mt-1">Add and manage learning resources for users</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Recommendation" : "Add Recommendation"}</DialogTitle>
                <DialogDescription>
                  {editing ? "Update the resource details." : "Add a new learning resource."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. React Complete Guide" />
                </div>
                <div>
                  <Label htmlFor="type">Resource Type *</Label>
                  <Select value={form.resource_type} onValueChange={(v) => setForm({ ...form, resource_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="provider">Provider</Label>
                  <Input id="provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Udemy, Coursera" />
                </div>
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input id="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="duration">Duration</Label>
                    <Input id="duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 10 hours" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the resource" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: v })} />
                  <Label>Free Resource</Label>
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
              <BookOpen className="h-5 w-5 text-primary" />
              Recommendations ({recommendations.length})
            </CardTitle>
            <CardDescription>All learning resources on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recommendations yet</h3>
                <p className="text-muted-foreground">Add learning resources to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Skill</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Free</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recommendations.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{rec.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rec.resource_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {rec.skills?.name ? <Badge variant="secondary">{rec.skills.name}</Badge> : "—"}
                        </TableCell>
                        <TableCell>
                          {rec.difficulty && (
                            <Badge className={difficultyColors[rec.difficulty] || "bg-muted"}>
                              {rec.difficulty.charAt(0).toUpperCase() + rec.difficulty.slice(1)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{rec.provider || "—"}</TableCell>
                        <TableCell>{rec.is_free ? "✓" : "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(rec)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(rec.id)}>
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
    </DashboardLayout>
  );
};

export default AdminRecommendations;
