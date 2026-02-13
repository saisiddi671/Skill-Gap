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
import { Briefcase, Plus, Pencil, Trash2, Target, LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JobRole {
  id: string;
  title: string;
  description: string | null;
  industry: string | null;
  experience_level: string | null;
  created_at: string;
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface JobRoleSkill {
  id: string;
  job_role_id: string;
  skill_id: string;
  required_proficiency: string;
  importance: string | null;
  skills: { name: string; category: string };
}

const EXPERIENCE_LEVELS = ["entry", "mid", "senior", "lead"];
const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Education", "E-commerce", "Consulting", "Media"];

const AdminJobRoles = () => {
  const { toast } = useToast();
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobRole | null>(null);
  const [form, setForm] = useState({ title: "", description: "", industry: "", experience_level: "" });
  const [saving, setSaving] = useState(false);

  // Skill assignment state
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);
  const [roleSkills, setRoleSkills] = useState<JobRoleSkill[]>([]);
  const [skillForm, setSkillForm] = useState({ skill_id: "", required_proficiency: "intermediate", importance: "required" });
  const [loadingSkills, setLoadingSkills] = useState(false);

  const fetchJobRoles = async () => {
    const { data, error } = await supabase
      .from("job_roles")
      .select("*")
      .order("title");
    if (!error) setJobRoles(data || []);
    setLoading(false);
  };

  const fetchAllSkills = async () => {
    const { data } = await supabase.from("skills").select("id, name, category").order("name");
    setSkills(data || []);
  };

  useEffect(() => {
    fetchJobRoles();
    fetchAllSkills();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", industry: "", experience_level: "" });
    setDialogOpen(true);
  };

  const openEdit = (role: JobRole) => {
    setEditing(role);
    setForm({
      title: role.title,
      description: role.description || "",
      industry: role.industry || "",
      experience_level: role.experience_level || "",
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
        industry: form.industry || null,
        experience_level: form.experience_level || null,
      };
      if (editing) {
        const { error } = await supabase.from("job_roles").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Job role updated successfully" });
      } else {
        const { error } = await supabase.from("job_roles").insert(payload);
        if (error) throw error;
        toast({ title: "Job role created successfully" });
      }
      setDialogOpen(false);
      fetchJobRoles();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("job_roles").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Job role deleted" });
      fetchJobRoles();
    } catch (error: any) {
      toast({ title: "Error deleting job role", description: error.message, variant: "destructive" });
    }
  };

  // Skill assignment functions
  const openSkillAssignment = async (role: JobRole) => {
    setSelectedRole(role);
    setLoadingSkills(true);
    setSkillDialogOpen(true);
    setSkillForm({ skill_id: "", required_proficiency: "intermediate", importance: "required" });

    const { data, error } = await supabase
      .from("job_role_skills")
      .select("id, job_role_id, skill_id, required_proficiency, importance, skills (name, category)")
      .eq("job_role_id", role.id);

    if (!error) setRoleSkills((data as unknown as JobRoleSkill[]) || []);
    setLoadingSkills(false);
  };

  const addSkillToRole = async () => {
    if (!selectedRole || !skillForm.skill_id) return;

    // Check if skill already assigned
    if (roleSkills.some((rs) => rs.skill_id === skillForm.skill_id)) {
      toast({ title: "Skill already assigned to this role", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("job_role_skills").insert({
        job_role_id: selectedRole.id,
        skill_id: skillForm.skill_id,
        required_proficiency: skillForm.required_proficiency,
        importance: skillForm.importance,
      });
      if (error) throw error;
      toast({ title: "Skill assigned successfully" });
      openSkillAssignment(selectedRole); // Refresh
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const removeSkillFromRole = async (skillMappingId: string) => {
    try {
      const { error } = await supabase.from("job_role_skills").delete().eq("id", skillMappingId);
      if (error) throw error;
      setRoleSkills((prev) => prev.filter((rs) => rs.id !== skillMappingId));
      toast({ title: "Skill removed from role" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Available skills (not yet assigned)
  const availableSkills = skills.filter((s) => !roleSkills.some((rs) => rs.skill_id === s.id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Job Roles</h1>
            <p className="text-muted-foreground mt-1">Create and edit job roles with skill requirements</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Job Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Job Role" : "Add New Job Role"}</DialogTitle>
                <DialogDescription>
                  {editing ? "Update the job role details." : "Fill in the details to create a new job role."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Frontend Developer" />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="level">Experience Level</Label>
                  <Select value={form.experience_level} onValueChange={(v) => setForm({ ...form, experience_level: v })}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the role" />
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

        {/* Skill Assignment Dialog */}
        <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Assign Skills to: {selectedRole?.title}
              </DialogTitle>
              <DialogDescription>
                Add required skills and proficiency levels for this job role.
              </DialogDescription>
            </DialogHeader>

            {/* Add Skill Form */}
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Add a Skill</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Skill</Label>
                  <Select value={skillForm.skill_id} onValueChange={(v) => setSkillForm({ ...skillForm, skill_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                    <SelectContent>
                      {availableSkills.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.category})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Proficiency</Label>
                  <Select value={skillForm.required_proficiency} onValueChange={(v) => setSkillForm({ ...skillForm, required_proficiency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Importance</Label>
                  <Select value={skillForm.importance} onValueChange={(v) => setSkillForm({ ...skillForm, importance: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Required</SelectItem>
                      <SelectItem value="preferred">Preferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={addSkillToRole} disabled={!skillForm.skill_id} size="sm" className="gap-1">
                <Plus className="h-3 w-3" />
                Add Skill
              </Button>
            </div>

            {/* Current Skills */}
            {loadingSkills ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : roleSkills.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No skills assigned yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Proficiency</TableHead>
                    <TableHead>Importance</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleSkills.map((rs) => (
                    <TableRow key={rs.id}>
                      <TableCell className="font-medium">{rs.skills.name}</TableCell>
                      <TableCell><Badge variant="outline">{rs.skills.category}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {rs.required_proficiency.charAt(0).toUpperCase() + rs.required_proficiency.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rs.importance === "required" ? "destructive" : "secondary"}>
                          {rs.importance || "Required"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeSkillFromRole(rs.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Job Roles ({jobRoles.length})
            </CardTitle>
            <CardDescription>All defined job roles on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : jobRoles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No job roles defined</h3>
                <p className="text-muted-foreground">Create job roles to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.title}</TableCell>
                        <TableCell>
                          {role.industry ? <Badge variant="outline">{role.industry}</Badge> : "—"}
                        </TableCell>
                        <TableCell>
                          {role.experience_level ? (
                            <Badge variant="secondary">
                              {role.experience_level.charAt(0).toUpperCase() + role.experience_level.slice(1)}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {role.description || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openSkillAssignment(role)} title="Assign Skills">
                              <LinkIcon className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(role)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)}>
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

export default AdminJobRoles;
