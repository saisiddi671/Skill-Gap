import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Target, Loader2, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface UserSkill {
  id: string;
  skill_id: string;
  proficiency_level: string;
  years_of_experience: number;
  skills: Skill;
}

const addSkillSchema = z.object({
  skill_name: z.string().min(2, "Skill name is required").max(100),
  category: z.string().min(2, "Category is required"),
  proficiency_level: z.enum(["beginner", "intermediate", "advanced"]),
  years_of_experience: z.string().optional(),
});

type AddSkillFormValues = z.infer<typeof addSkillSchema>;

const proficiencyColors: Record<string, string> = {
  beginner: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  intermediate: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  advanced: "bg-green-500/10 text-green-600 border-green-500/20",
};

const categories = [
  "Programming Languages",
  "Frameworks & Libraries",
  "Databases",
  "DevOps & Cloud",
  "Design & UI/UX",
  "Data Science",
  "Soft Skills",
  "Tools & Platforms",
  "Other",
];

const SkillsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);

  const form = useForm<AddSkillFormValues>({
    resolver: zodResolver(addSkillSchema),
    defaultValues: {
      skill_name: "",
      category: "",
      proficiency_level: "beginner",
      years_of_experience: "0",
    },
  });

  const [editProficiency, setEditProficiency] = useState<string>("beginner");
  const [editYears, setEditYears] = useState<string>("0");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUserSkills = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_skills")
        .select(`
          id,
          skill_id,
          proficiency_level,
          years_of_experience,
          skills (id, name, category)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserSkills(data as UserSkill[] || []);
    } catch (error) {
      console.error("Error fetching user skills:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserSkills();
  }, [user]);

  const onSubmit = async (values: AddSkillFormValues) => {
    if (!user) return;

    try {
      // First, check if skill exists or create it
      let { data: existingSkill } = await supabase
        .from("skills")
        .select("id")
        .eq("name", values.skill_name)
        .maybeSingle();

      let skillId: string;

      if (existingSkill) {
        skillId = existingSkill.id;
      } else {
        const { data: newSkill, error: skillError } = await supabase
          .from("skills")
          .insert({
            name: values.skill_name,
            category: values.category,
          })
          .select("id")
          .single();

        if (skillError) throw skillError;
        skillId = newSkill.id;
      }

      // Check if user already has this skill
      const { data: existingUserSkill } = await supabase
        .from("user_skills")
        .select("id")
        .eq("user_id", user.id)
        .eq("skill_id", skillId)
        .maybeSingle();

      if (existingUserSkill) {
        toast({
          title: "Skill already added",
          description: "You've already added this skill to your profile.",
          variant: "destructive",
        });
        return;
      }

      // Add skill to user's profile
      const { error: userSkillError } = await supabase.from("user_skills").insert({
        user_id: user.id,
        skill_id: skillId,
        proficiency_level: values.proficiency_level,
        years_of_experience: values.years_of_experience ? parseInt(values.years_of_experience) : 0,
      });

      if (userSkillError) throw userSkillError;

      toast({ title: "Skill added successfully" });
      setDialogOpen(false);
      form.reset();
      fetchUserSkills();
    } catch (error) {
      console.error("Error adding skill:", error);
      toast({
        title: "Error",
        description: "Failed to add skill. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteUserSkill = async (id: string) => {
    try {
      const { error } = await supabase.from("user_skills").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Skill removed" });
      fetchUserSkills();
    } catch (error) {
      console.error("Error deleting skill:", error);
      toast({
        title: "Error",
        description: "Failed to remove skill.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (skill: UserSkill) => {
    setEditingSkill(skill);
    setEditProficiency(skill.proficiency_level || "beginner");
    setEditYears(skill.years_of_experience?.toString() || "0");
    setEditDialogOpen(true);
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("user_skills")
        .update({
          proficiency_level: editProficiency,
          years_of_experience: editYears ? parseInt(editYears) : 0,
        })
        .eq("id", editingSkill.id);

      if (error) throw error;

      toast({ title: "Skill updated successfully" });
      setEditDialogOpen(false);
      setEditingSkill(null);
      fetchUserSkills();
    } catch (error) {
      console.error("Error updating skill:", error);
      toast({
        title: "Error",
        description: "Failed to update skill.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Group skills by category
  const skillsByCategory = userSkills.reduce((acc, skill) => {
    const category = skill.skills?.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, UserSkill[]>);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Skill</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="skill_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skill Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., JavaScript, React, Project Management" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proficiency_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proficiency Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select proficiency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="years_of_experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Experience</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="50" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Skill
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {userSkills.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No skills added yet</p>
          <p className="text-sm text-muted-foreground">Add your technical and soft skills to track your abilities</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(skillsByCategory).map(([category, skills]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="group flex items-center gap-2 px-3 py-2 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium text-sm">{skill.skills?.name}</span>
                    <Badge
                      variant="outline"
                      className={proficiencyColors[skill.proficiency_level] || ""}
                    >
                      {skill.proficiency_level}
                    </Badge>
                    {skill.years_of_experience > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {skill.years_of_experience}y
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openEditDialog(skill)}
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteUserSkill(skill.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Skill: {editingSkill?.skills?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Proficiency Level</Label>
              <Select
                value={editProficiency}
                onValueChange={setEditProficiency}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select proficiency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={editYears}
                onChange={(e) => setEditYears(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Skill
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SkillsSection;
