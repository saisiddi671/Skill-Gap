import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Briefcase, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkExperience {
  id: string;
  job_title: string;
  company: string;
  industry: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

const experienceSchema = z.object({
  job_title: z.string().min(2, "Job title is required").max(100),
  company: z.string().min(2, "Company is required").max(200),
  industry: z.string().max(100).optional().or(z.literal("")),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_current: z.boolean().default(false),
  description: z.string().max(500).optional().or(z.literal("")),
});

type ExperienceFormValues = z.infer<typeof experienceSchema>;

const ExperienceSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [experience, setExperience] = useState<WorkExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      job_title: "",
      company: "",
      industry: "",
      start_date: "",
      end_date: "",
      is_current: false,
      description: "",
    },
  });

  const fetchExperience = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("work_experience")
        .select("*")
        .eq("user_id", user.id)
        .order("end_date", { ascending: false, nullsFirst: true });

      if (error) throw error;
      setExperience(data || []);
    } catch (error) {
      console.error("Error fetching experience:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperience();
  }, [user]);

  const openAddDialog = () => {
    setEditingId(null);
    form.reset({
      job_title: "",
      company: "",
      industry: "",
      start_date: "",
      end_date: "",
      is_current: false,
      description: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (exp: WorkExperience) => {
    setEditingId(exp.id);
    form.reset({
      job_title: exp.job_title,
      company: exp.company,
      industry: exp.industry || "",
      start_date: exp.start_date || "",
      end_date: exp.end_date || "",
      is_current: exp.is_current || false,
      description: exp.description || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: ExperienceFormValues) => {
    if (!user) return;

    try {
      const experienceData = {
        user_id: user.id,
        job_title: values.job_title,
        company: values.company,
        industry: values.industry || null,
        start_date: values.start_date || null,
        end_date: values.is_current ? null : (values.end_date || null),
        is_current: values.is_current,
        description: values.description || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("work_experience")
          .update(experienceData)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Experience updated" });
      } else {
        const { error } = await supabase.from("work_experience").insert(experienceData);

        if (error) throw error;
        toast({ title: "Experience added" });
      }

      setDialogOpen(false);
      fetchExperience();
    } catch (error) {
      console.error("Error saving experience:", error);
      toast({
        title: "Error",
        description: "Failed to save experience. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteExperience = async (id: string) => {
    try {
      const { error } = await supabase.from("work_experience").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Experience deleted" });
      fetchExperience();
    } catch (error) {
      console.error("Error deleting experience:", error);
      toast({
        title: "Error",
        description: "Failed to delete experience.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "?";
    try {
      return format(new Date(dateStr), "MMM yyyy");
    } catch {
      return dateStr;
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
              Add Experience
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Experience" : "Add Experience"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="job_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Software Developer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input placeholder="Company Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Technology" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 grid-cols-2">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
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
                      <FormLabel className="!mt-0">I currently work here</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of your role and responsibilities..."
                          className="min-h-[80px]"
                          {...field}
                        />
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
                    {editingId ? "Update" : "Add"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {experience.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No work experience added yet</p>
          <p className="text-sm text-muted-foreground">Add your professional experience to showcase your career history</p>
        </div>
      ) : (
        <div className="space-y-4">
          {experience.map((exp) => (
            <div
              key={exp.id}
              className="flex items-start justify-between p-4 border rounded-lg bg-card"
            >
              <div className="flex gap-4">
                <div className="p-2 bg-primary/10 rounded-lg h-fit">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{exp.job_title}</h4>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  {exp.industry && <p className="text-sm text-muted-foreground">{exp.industry}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(exp.start_date)} - {exp.is_current ? "Present" : formatDate(exp.end_date)}
                  </p>
                  {exp.description && (
                    <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(exp)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteExperience(exp.id)}>
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

export default ExperienceSection;
