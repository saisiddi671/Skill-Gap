import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GraduationCap, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Education {
  id: string;
  degree: string;
  field_of_study: string;
  institution: string;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
}

const educationSchema = z.object({
  degree: z.string().min(2, "Degree is required").max(100),
  field_of_study: z.string().min(2, "Field of study is required").max(100),
  institution: z.string().min(2, "Institution is required").max(200),
  start_year: z.string().optional(),
  end_year: z.string().optional(),
  is_current: z.boolean().default(false),
});

type EducationFormValues = z.infer<typeof educationSchema>;

const EducationSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [education, setEducation] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      degree: "",
      field_of_study: "",
      institution: "",
      start_year: "",
      end_year: "",
      is_current: false,
    },
  });

  const fetchEducation = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("education")
        .select("*")
        .eq("user_id", user.id)
        .order("end_year", { ascending: false, nullsFirst: true });

      if (error) throw error;
      setEducation(data || []);
    } catch (error) {
      console.error("Error fetching education:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEducation();
  }, [user]);

  const openAddDialog = () => {
    setEditingId(null);
    form.reset({
      degree: "",
      field_of_study: "",
      institution: "",
      start_year: "",
      end_year: "",
      is_current: false,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (edu: Education) => {
    setEditingId(edu.id);
    form.reset({
      degree: edu.degree,
      field_of_study: edu.field_of_study,
      institution: edu.institution,
      start_year: edu.start_year?.toString() || "",
      end_year: edu.end_year?.toString() || "",
      is_current: edu.is_current || false,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: EducationFormValues) => {
    if (!user) return;

    try {
      const educationData = {
        user_id: user.id,
        degree: values.degree,
        field_of_study: values.field_of_study,
        institution: values.institution,
        start_year: values.start_year ? parseInt(values.start_year) : null,
        end_year: values.is_current ? null : (values.end_year ? parseInt(values.end_year) : null),
        is_current: values.is_current,
      };

      if (editingId) {
        const { error } = await supabase
          .from("education")
          .update(educationData)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Education updated" });
      } else {
        const { error } = await supabase.from("education").insert(educationData);

        if (error) throw error;
        toast({ title: "Education added" });
      }

      setDialogOpen(false);
      fetchEducation();
    } catch (error) {
      console.error("Error saving education:", error);
      toast({
        title: "Error",
        description: "Failed to save education. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteEducation = async (id: string) => {
    try {
      const { error } = await supabase.from("education").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Education deleted" });
      fetchEducation();
    } catch (error) {
      console.error("Error deleting education:", error);
      toast({
        title: "Error",
        description: "Failed to delete education.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Education
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Education" : "Add Education"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="degree"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Degree / Qualification</FormLabel>
                      <FormControl>
                        <Input placeholder="Bachelor of Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="field_of_study"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Field of Study</FormLabel>
                      <FormControl>
                        <Input placeholder="Computer Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution</FormLabel>
                      <FormControl>
                        <Input placeholder="University Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 grid-cols-2">
                  <FormField
                    control={form.control}
                    name="start_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Year</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2020" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2024"
                            disabled={form.watch("is_current")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="is_current"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Currently studying here</FormLabel>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingId ? "Update" : "Add"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {education.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No education added yet</p>
          <p className="text-sm text-muted-foreground">Add your academic qualifications to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {education.map((edu) => (
            <div
              key={edu.id}
              className="flex items-start justify-between p-4 border rounded-lg bg-card"
            >
              <div className="flex gap-4">
                <div className="p-2 bg-primary/10 rounded-lg h-fit">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{edu.degree}</h4>
                  <p className="text-sm text-muted-foreground">{edu.field_of_study}</p>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {edu.start_year || "?"} - {edu.is_current ? "Present" : (edu.end_year || "?")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(edu)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteEducation(edu.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EducationSection;
