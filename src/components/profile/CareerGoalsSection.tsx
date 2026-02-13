import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CareerGoals {
  id: string;
  target_job_role: string | null;
  target_industry: string | null;
  timeline: string | null;
  notes: string | null;
}

const careerGoalsSchema = z.object({
  target_job_role: z.string().min(2, "Target job role is required").max(200),
  target_industry: z.string().max(100).optional().or(z.literal("")),
  timeline: z.string().optional(),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

type CareerGoalsFormValues = z.infer<typeof careerGoalsSchema>;

const timelines = [
  { value: "3_months", label: "Within 3 months" },
  { value: "6_months", label: "Within 6 months" },
  { value: "1_year", label: "Within 1 year" },
  { value: "2_years", label: "Within 2 years" },
  { value: "exploring", label: "Just exploring" },
];

const CareerGoalsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [careerGoals, setCareerGoals] = useState<CareerGoals | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<CareerGoalsFormValues>({
    resolver: zodResolver(careerGoalsSchema),
    defaultValues: {
      target_job_role: "",
      target_industry: "",
      timeline: "",
      notes: "",
    },
  });

  useEffect(() => {
    const fetchCareerGoals = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("career_goals")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setCareerGoals(data);
          form.reset({
            target_job_role: data.target_job_role || "",
            target_industry: data.target_industry || "",
            timeline: data.timeline || "",
            notes: data.notes || "",
          });
        }
      } catch (error) {
        console.error("Error fetching career goals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCareerGoals();
  }, [user, form]);

  const onSubmit = async (values: CareerGoalsFormValues) => {
    if (!user) return;

    try {
      const goalsData = {
        user_id: user.id,
        target_job_role: values.target_job_role,
        target_industry: values.target_industry || null,
        timeline: values.timeline || null,
        notes: values.notes || null,
      };

      if (careerGoals) {
        // Update existing
        const { data, error } = await supabase
          .from("career_goals")
          .update(goalsData)
          .eq("id", careerGoals.id)
          .select()
          .single();

        if (error) throw error;
        setCareerGoals(data);
      } else {
        // Create new
        const { data, error } = await supabase
          .from("career_goals")
          .insert(goalsData)
          .select()
          .single();

        if (error) throw error;
        setCareerGoals(data);
      }

      toast({
        title: "Career goals saved",
        description: "Your career aspirations have been updated.",
      });
    } catch (error) {
      console.error("Error saving career goals:", error);
      toast({
        title: "Error",
        description: "Failed to save career goals. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="target_job_role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Job Role</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Senior Software Engineer, Data Scientist, Product Manager"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="target_industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Industry (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Technology, Finance, Healthcare"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timeline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timeline</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="When do you want to achieve this goal?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timelines.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional career aspirations, motivations, or specific goals you'd like to track..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Career Goals
        </Button>
      </form>
    </Form>
  );
};

export default CareerGoalsSection;
