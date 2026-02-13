import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowUpCircle,
  XCircle,
  Briefcase,
  BookOpen,
  BarChart3,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface UserSkill {
  skill_id: string;
  proficiency_level: string;
  skills: Skill;
}

interface JobRole {
  id: string;
  title: string;
  industry: string | null;
}

interface JobRoleSkill {
  skill_id: string;
  required_proficiency: string;
  importance: string | null;
  skills: Skill;
}

interface JobRoleWithSkills extends JobRole {
  job_role_skills: JobRoleSkill[];
}

const proficiencyToNumber: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const numberToProficiency: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
};

const SkillGap = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedRoleData, setSelectedRoleData] = useState<JobRoleWithSkills | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;

      try {
        // Fetch user's skills
        const { data: skillsData, error: skillsError } = await supabase
          .from("user_skills")
          .select(`
            skill_id,
            proficiency_level,
            skills (id, name, category)
          `)
          .eq("user_id", user.id);

        if (skillsError) throw skillsError;
        setUserSkills(skillsData || []);

        // Fetch all job roles
        const { data: rolesData, error: rolesError } = await supabase
          .from("job_roles")
          .select("id, title, industry")
          .order("title");

        if (rolesError) throw rolesError;
        setJobRoles(rolesData || []);

        // Auto-select first role if available
        if (rolesData && rolesData.length > 0) {
          setSelectedRole(rolesData[0].id);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load skill gap data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user, toast]);

  useEffect(() => {
    const fetchRoleDetails = async () => {
      if (!selectedRole) return;

      setRoleLoading(true);
      try {
        const { data, error } = await supabase
          .from("job_roles")
          .select(`
            id,
            title,
            industry,
            job_role_skills (
              skill_id,
              required_proficiency,
              importance,
              skills (id, name, category)
            )
          `)
          .eq("id", selectedRole)
          .single();

        if (error) throw error;
        setSelectedRoleData(data);
      } catch (error) {
        console.error("Error fetching role details:", error);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchRoleDetails();
  }, [selectedRole]);

  const getUserSkillLevel = (skillId: string): number => {
    const skill = userSkills.find((s) => s.skill_id === skillId);
    return skill ? proficiencyToNumber[skill.proficiency_level] || 0 : 0;
  };

  const calculateGapAnalysis = () => {
    if (!selectedRoleData) return null;

    const skills = selectedRoleData.job_role_skills.map((roleSkill) => {
      const userLevel = getUserSkillLevel(roleSkill.skill_id);
      const requiredLevel = proficiencyToNumber[roleSkill.required_proficiency] || 2;
      const gap = requiredLevel - userLevel;

      return {
        skillId: roleSkill.skill_id,
        name: roleSkill.skills.name,
        category: roleSkill.skills.category,
        userLevel,
        requiredLevel,
        gap: Math.max(0, gap),
        status: gap <= 0 ? "met" : gap === 1 ? "partial" : "missing",
        importance: roleSkill.importance,
      };
    });

    const metSkills = skills.filter((s) => s.status === "met");
    const partialSkills = skills.filter((s) => s.status === "partial");
    const missingSkills = skills.filter((s) => s.status === "missing");

    // Calculate readiness score
    let totalWeight = 0;
    let earnedWeight = 0;

    skills.forEach((skill) => {
      const weight = skill.importance === "required" ? 3 : 1;
      totalWeight += weight * skill.requiredLevel;
      earnedWeight += weight * Math.min(skill.userLevel, skill.requiredLevel);
    });

    const readinessScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    return {
      skills,
      metSkills,
      partialSkills,
      missingSkills,
      readinessScore,
      totalSkills: skills.length,
    };
  };

  const analysis = calculateGapAnalysis();

  // Prepare radar chart data
  const radarData = analysis?.skills.slice(0, 8).map((skill) => ({
    skill: skill.name.length > 12 ? skill.name.substring(0, 12) + "..." : skill.name,
    current: skill.userLevel,
    required: skill.requiredLevel,
    fullMark: 3,
  })) || [];

  // Prepare bar chart data
  const barData = analysis?.skills.map((skill) => ({
    name: skill.name.length > 15 ? skill.name.substring(0, 15) + "..." : skill.name,
    gap: skill.gap,
    current: skill.userLevel,
    required: skill.requiredLevel,
  })) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "met":
        return "text-green-600";
      case "partial":
        return "text-yellow-600";
      case "missing":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "met":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "partial":
        return <ArrowUpCircle className="h-5 w-5 text-yellow-600" />;
      case "missing":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              Skill Gap Analysis
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare your skills against target job requirements
            </p>
          </div>
          <div className="w-full md:w-72">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job role" />
              </SelectTrigger>
              <SelectContent>
                {jobRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {userSkills.length === 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium">No skills in your profile</p>
                <p className="text-sm text-muted-foreground">
                  Add skills to your profile to see your skill gap analysis
                </p>
              </div>
              <Button asChild>
                <Link to="/profile">Add Skills</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {roleLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : analysis ? (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{analysis.readinessScore}%</p>
                      <p className="text-sm text-muted-foreground">Readiness Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-green-600">{analysis.metSkills.length}</p>
                      <p className="text-sm text-muted-foreground">Skills Met</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 rounded-lg">
                      <ArrowUpCircle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-yellow-600">{analysis.partialSkills.length}</p>
                      <p className="text-sm text-muted-foreground">Need Improvement</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <XCircle className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-red-500">{analysis.missingSkills.length}</p>
                      <p className="text-sm text-muted-foreground">Missing Skills</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Skills Comparison
                  </CardTitle>
                  <CardDescription>Your skills vs required levels</CardDescription>
                </CardHeader>
                <CardContent>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 3]} tick={{ fontSize: 10 }} />
                        <Radar
                          name="Your Level"
                          dataKey="current"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.5}
                        />
                        <Radar
                          name="Required"
                          dataKey="required"
                          stroke="hsl(var(--destructive))"
                          fill="hsl(var(--destructive))"
                          fillOpacity={0.2}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No skills to compare
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gap Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Skill Gap Overview
                  </CardTitle>
                  <CardDescription>Gap levels for each skill</CardDescription>
                </CardHeader>
                <CardContent>
                  {barData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 3]} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === "current" ? numberToProficiency[value] || value : value,
                            name === "current" ? "Your Level" : "Gap",
                          ]}
                        />
                        <Bar dataKey="current" fill="hsl(var(--primary))" name="Your Level" />
                        <Bar dataKey="gap" fill="hsl(var(--destructive))" name="Gap" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No gap data to display
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Skills List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Detailed Skill Analysis for {selectedRoleData?.title}
                </CardTitle>
                <CardDescription>
                  Complete breakdown of required skills and your current levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.skills.map((skill) => (
                    <div
                      key={skill.skillId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(skill.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{skill.name}</p>
                            {skill.importance === "required" && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{skill.category}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Your level: </span>
                            <span className={getStatusColor(skill.status)}>
                              {numberToProficiency[skill.userLevel] || "None"}
                            </span>
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Required: </span>
                            <span className="font-medium">
                              {numberToProficiency[skill.requiredLevel]}
                            </span>
                          </p>
                        </div>

                        {skill.gap > 0 && (
                          <div className="w-24">
                            <Progress
                              value={((3 - skill.gap) / 3) * 100}
                              className="h-2"
                            />
                            <p className="text-xs text-center mt-1 text-muted-foreground">
                              {skill.gap} level{skill.gap > 1 ? "s" : ""} to go
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-4">
                  <Button asChild className="flex-1">
                    <Link to="/recommendations">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Get Recommendations
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="flex-1">
                    <Link to="/assessments">
                      <Target className="mr-2 h-4 w-4" />
                      Take Assessments
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Select a job role to analyze</p>
              <p className="text-muted-foreground">
                Choose a target role from the dropdown above
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SkillGap;
