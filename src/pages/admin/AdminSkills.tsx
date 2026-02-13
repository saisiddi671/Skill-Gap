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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string | null;
  created_at: string;
}

const CATEGORIES = ["Programming", "Frameworks", "Databases", "DevOps", "Data Science", "Soft Skills", "Design"];

const AdminSkills = () => {
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [form, setForm] = useState({ name: "", category: "", description: "" });
  const [saving, setSaving] = useState(false);

  const fetchSkills = async () => {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .order("category")
      .order("name");
    if (!error) setSkills(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSkills(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", category: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditing(skill);
    setForm({ name: skill.name, category: skill.category, description: skill.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("skills")
          .update({ name: form.name, category: form.category, description: form.description || null })
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Skill updated successfully" });
      } else {
        const { error } = await supabase
          .from("skills")
          .insert({ name: form.name, category: form.category, description: form.description || null });
        if (error) throw error;
        toast({ title: "Skill created successfully" });
      }
      setDialogOpen(false);
      fetchSkills();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("skills").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Skill deleted" });
      fetchSkills();
    } catch (error: any) {
      toast({ title: "Error deleting skill", description: error.message, variant: "destructive" });
    }
  };

  // Group by category
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Skills</h1>
            <p className="text-muted-foreground mt-1">Add, edit, or remove skills from the catalog</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Skill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Skill" : "Add New Skill"}</DialogTitle>
                <DialogDescription>
                  {editing ? "Update the skill details below." : "Fill in the details to create a new skill."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Skill Name</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. React" />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the skill" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.name || !form.category}>
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : skills.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No skills in catalog</h3>
              <p className="text-muted-foreground">Add skills to get started.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([category, categorySkills]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base">{category}</CardTitle>
                <CardDescription>{categorySkills.length} skill{categorySkills.length !== 1 ? "s" : ""}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorySkills.map((skill) => (
                      <TableRow key={skill.id}>
                        <TableCell className="font-medium">{skill.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{skill.description || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(skill)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(skill.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminSkills;
