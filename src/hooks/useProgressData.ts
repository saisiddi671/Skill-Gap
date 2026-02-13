import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface AssessmentResult {
  id: string;
  score: number;
  max_score: number;
  percentage: number | null;
  calculated_level: string | null;
  completed_at: string;
  assessments: {
    title: string;
    difficulty: string | null;
    skills: Skill | null;
  };
}

export interface AdaptiveResult {
  id: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  calculated_level: string | null;
  completed_at: string | null;
  difficulty_level: string;
  skills: Skill;
}

export interface UserSkillWithDetails {
  id: string;
  skill_id: string;
  proficiency_level: string;
  years_of_experience: number | null;
  updated_at: string;
  skills: Skill;
}

export interface ProgressStats {
  totalAssessments: number;
  averageScore: number;
  totalSkills: number;
  highestLevel: string;
  assessmentsThisMonth: number;
  skillsByCategory: Record<string, number>;
}

export const useProgressData = () => {
  const { user } = useAuth();
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [adaptiveResults, setAdaptiveResults] = useState<AdaptiveResult[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkillWithDetails[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalAssessments: 0,
    averageScore: 0,
    totalSkills: 0,
    highestLevel: "N/A",
    assessmentsThisMonth: 0,
    skillsByCategory: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgressData = async () => {
      if (!user) return;

      try {
        const [assessmentRes, adaptiveRes, skillsRes] = await Promise.all([
          supabase
            .from("assessment_results")
            .select(`
              id, score, max_score, percentage, calculated_level, completed_at,
              assessments (title, difficulty, skills (id, name, category))
            `)
            .eq("user_id", user.id)
            .order("completed_at", { ascending: false }),
          supabase
            .from("adaptive_assessments")
            .select(`
              id, score, max_score, percentage, calculated_level, completed_at, difficulty_level,
              skills (id, name, category)
            `)
            .eq("user_id", user.id)
            .not("completed_at", "is", null)
            .order("completed_at", { ascending: false }),
          supabase
            .from("user_skills")
            .select(`
              id, skill_id, proficiency_level, years_of_experience, updated_at,
              skills (id, name, category)
            `)
            .eq("user_id", user.id),
        ]);

        const assessments = (assessmentRes.data as unknown as AssessmentResult[]) || [];
        const adaptive = (adaptiveRes.data as unknown as AdaptiveResult[]) || [];
        const skills = (skillsRes.data as unknown as UserSkillWithDetails[]) || [];

        setAssessmentResults(assessments);
        setAdaptiveResults(adaptive);
        setUserSkills(skills);

        // Calculate stats
        const allScores = [
          ...assessments.map((a) => a.percentage || 0),
          ...adaptive.map((a) => a.percentage || 0),
        ];
        const totalAssessments = assessments.length + adaptive.length;
        const averageScore = allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : 0;

        const levelOrder = ["beginner", "intermediate", "advanced"];
        const allLevels = [
          ...assessments.map((a) => a.calculated_level?.toLowerCase() || ""),
          ...adaptive.map((a) => a.calculated_level?.toLowerCase() || ""),
          ...skills.map((s) => s.proficiency_level.toLowerCase()),
        ].filter(Boolean);
        const highestLevelIndex = Math.max(...allLevels.map((l) => levelOrder.indexOf(l)), -1);
        const highestLevel = highestLevelIndex >= 0
          ? levelOrder[highestLevelIndex].charAt(0).toUpperCase() + levelOrder[highestLevelIndex].slice(1)
          : "N/A";

        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const assessmentsThisMonth =
          assessments.filter((a) => a.completed_at >= thisMonth).length +
          adaptive.filter((a) => a.completed_at && a.completed_at >= thisMonth).length;

        const skillsByCategory: Record<string, number> = {};
        skills.forEach((s) => {
          const cat = s.skills.category;
          skillsByCategory[cat] = (skillsByCategory[cat] || 0) + 1;
        });

        setStats({
          totalAssessments,
          averageScore,
          totalSkills: skills.length,
          highestLevel,
          assessmentsThisMonth,
          skillsByCategory,
        });
      } catch (error) {
        console.error("Error fetching progress data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [user]);

  return { assessmentResults, adaptiveResults, userSkills, stats, loading };
};
