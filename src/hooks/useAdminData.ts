import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminStats {
  totalUsers: number;
  totalSkills: number;
  totalJobRoles: number;
  totalAssessments: number;
  totalAssessmentResults: number;
  totalRecommendations: number;
  recentSignups: number;
}

export interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  role: string;
}

export const useAdminData = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSkills: 0,
    totalJobRoles: 0,
    totalAssessments: 0,
    totalAssessmentResults: 0,
    totalRecommendations: 0,
    recentSignups: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [skillsRes, jobRolesRes, assessmentsRes, resultsRes, usersRes, recsRes] = await Promise.all([
          supabase.from("skills").select("id", { count: "exact", head: true }),
          supabase.from("job_roles").select("id", { count: "exact", head: true }),
          supabase.from("assessments").select("id", { count: "exact", head: true }),
          supabase.from("assessment_results").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("recommendations").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          totalUsers: usersRes.count || 0,
          totalSkills: skillsRes.count || 0,
          totalJobRoles: jobRolesRes.count || 0,
          totalAssessments: assessmentsRes.count || 0,
          totalAssessmentResults: resultsRes.count || 0,
          totalRecommendations: recsRes.count || 0,
          recentSignups: 0,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
};
