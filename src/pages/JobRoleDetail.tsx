import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Briefcase,
  Target,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  Star,
} from "lucide-react";

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface JobRoleSkill {
  skill_id: string;
  required_proficiency: string;
  importance: string | null;
  skills: Skill;
}

interface JobRole {
  id: string;
  title: string;
  description: string | null;
  industry: string | null;
  experience_level: string | null;
  job_role_skills: JobRoleSkill[];
}

interface UserSkill {
  skill_id: string;
  proficiency_level: string;
}

const proficiencyOrder = ["beginner", "intermediate", "advanced"];

const proficiencyColors: Record<string, string> = {
  beginner: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  intermediate: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  advanced: "bg-green-500/10 text-green-600 border-green-500/20",
};

const experienceLevelLabels: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior Level",
};

const JobRoleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [jobRole, setJobRole] = useState<JobRole | null>(null);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch job role with skills
        const { data: roleData, error: roleError } = await supabase
          .from("job_roles")
          .select(`
            id,
            title,
            description,
            industry,
            experience_level,
            job_role_skills (
              skill_id,
              required_proficiency,
              importance,
              skills (id, name, category)
            )
          `)
          .eq("id", id)
          .single();

        if (roleError) throw roleError;
        setJobRole(roleData);

        // Fetch user's skills
        if (user) {
          const { data: skillsData, error: skillsError } = await supabase
            .from("user_skills")
            .select("skill_id, proficiency_level")
            .eq("user_id", user.id);

          if (skillsError) throw skillsError;
          setUserSkills(skillsData || []);
        }
      } catch (error) {
        console.error("Error fetching job role:", error);
        toast({
          title: "Error",
          description: "Failed to load job role details",
          variant: "destructive",
        });
        navigate("/job-roles");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, navigate, toast]);

  const getUserSkillLevel = (skillId: string): string | null => {
    const skill = userSkills.find((s) => s.skill_id === skillId);
    return skill?.proficiency_level || null;
  };

  const getSkillMatch = (required: string, current: string | null) => {
    if (!current) return "missing";
    const requiredIdx = proficiencyOrder.indexOf(required);
    const currentIdx = proficiencyOrder.indexOf(current);
    if (currentIdx >= requiredIdx) return "met";
    return "gap";
  };

  // Calculate overall match percentage
  const calculateMatch = () => {
    if (!jobRole) return 0;
    const totalSkills = jobRole.job_role_skills.length;
    if (totalSkills === 0) return 0;

    let matchedWeight = 0;
    let totalWeight = 0;

    jobRole.job_role_skills.forEach((skill) => {
      const weight = skill.importance === "required" ? 2 : 1;
      totalWeight += weight;

      const userLevel = getUserSkillLevel(skill.skill_id);
      const match = getSkillMatch(skill.required_proficiency, userLevel);

      if (match === "met") {
        matchedWeight += weight;
      } else if (match === "gap") {
        matchedWeight += weight * 0.5; // Partial credit for having the skill
      }
    });

    return Math.round((matchedWeight / totalWeight) * 100);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </DashboardLayout>
    );
  }

  if (!jobRole) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium">Job role not found</p>
              <Button onClick={() => navigate("/job-roles")} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Job Roles
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const matchPercentage = calculateMatch();
  const requiredSkills = jobRole.job_role_skills.filter((s) => s.importance === "required");
  const preferredSkills = jobRole.job_role_skills.filter((s) => s.importance !== "required");

  // Group skills by match status
  const skillsGrouped = {
    met: jobRole.job_role_skills.filter(
      (s) => getSkillMatch(s.required_proficiency, getUserSkillLevel(s.skill_id)) === "met"
    ),
    gap: jobRole.job_role_skills.filter(
      (s) => getSkillMatch(s.required_proficiency, getUserSkillLevel(s.skill_id)) === "gap"
    ),
    missing: jobRole.job_role_skills.filter(
      (s) => getSkillMatch(s.required_proficiency, getUserSkillLevel(s.skill_id)) === "missing"
    ),
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/job-roles")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job Roles
        </Button>

        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{jobRole.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  {jobRole.industry && <Badge variant="outline">{jobRole.industry}</Badge>}
                  {jobRole.experience_level && (
                    <Badge variant="secondary">
                      {experienceLevelLabels[jobRole.experience_level] || jobRole.experience_level}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-base">
                  {jobRole.description || "Explore the skills and requirements for this role."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{matchPercentage}%</p>
                <p className="text-sm text-muted-foreground">Match Score</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{skillsGrouped.met.length}</p>
                <p className="text-sm text-muted-foreground">Skills Met</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-600">{skillsGrouped.gap.length}</p>
                <p className="text-sm text-muted-foreground">Need Improvement</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{skillsGrouped.missing.length}</p>
                <p className="text-sm text-muted-foreground">Missing Skills</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role Match Progress</span>
                <span className="font-medium">{matchPercentage}%</span>
              </div>
              <Progress value={matchPercentage} className="h-3" />
            </div>

            <div className="mt-6 flex gap-4">
              <Button asChild className="flex-1">
                <Link to="/skill-gap">View Full Skill Gap Analysis</Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link to="/recommendations">Get Recommendations</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Required Skills */}
        {requiredSkills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Required Skills ({requiredSkills.length})
              </CardTitle>
              <CardDescription>Essential skills for this role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requiredSkills.map((roleSkill) => {
                  const userLevel = getUserSkillLevel(roleSkill.skill_id);
                  const match = getSkillMatch(roleSkill.required_proficiency, userLevel);

                  return (
                    <div
                      key={roleSkill.skill_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {match === "met" && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        {match === "gap" && (
                          <ArrowUpCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        {match === "missing" && <XCircle className="h-5 w-5 text-red-500" />}
                        <div>
                          <p className="font-medium">{roleSkill.skills.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {roleSkill.skills.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {userLevel && (
                          <Badge variant="outline" className={proficiencyColors[userLevel]}>
                            You: {userLevel}
                          </Badge>
                        )}
                        <Badge className={proficiencyColors[roleSkill.required_proficiency]}>
                          Required: {roleSkill.required_proficiency}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preferred Skills */}
        {preferredSkills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Preferred Skills ({preferredSkills.length})
              </CardTitle>
              <CardDescription>Nice-to-have skills that strengthen your application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {preferredSkills.map((roleSkill) => {
                  const userLevel = getUserSkillLevel(roleSkill.skill_id);
                  const match = getSkillMatch(roleSkill.required_proficiency, userLevel);

                  return (
                    <div
                      key={roleSkill.skill_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {match === "met" && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        {match === "gap" && (
                          <ArrowUpCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        {match === "missing" && <XCircle className="h-5 w-5 text-muted-foreground" />}
                        <div>
                          <p className="font-medium">{roleSkill.skills.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {roleSkill.skills.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {userLevel && (
                          <Badge variant="outline" className={proficiencyColors[userLevel]}>
                            You: {userLevel}
                          </Badge>
                        )}
                        <Badge variant="outline" className={proficiencyColors[roleSkill.required_proficiency]}>
                          Preferred: {roleSkill.required_proficiency}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default JobRoleDetail;