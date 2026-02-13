import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  User,
  GraduationCap,
  Briefcase,
  Target,
  TrendingUp,
  ClipboardCheck,
  BookOpen,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface ProfileData {
  full_name: string | null;
}

interface DashboardStats {
  educationCount: number;
  experienceCount: number;
  skillsCount: number;
  assessmentsCompleted: number;
  profileComplete: boolean;
}

const Dashboard = () => {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    educationCount: 0,
    experienceCount: 0,
    skillsCount: 0,
    assessmentsCompleted: 0,
    profileComplete: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        setProfile(profileData);

        // Fetch stats
        const [educationRes, experienceRes, skillsRes, assessmentRes, careerRes] = await Promise.all([
          supabase.from("education").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase.from("work_experience").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase.from("user_skills").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase.from("assessment_results").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase.from("career_goals").select("id").eq("user_id", user.id).maybeSingle(),
        ]);

        const hasCareerGoal = !!careerRes.data;
        const hasEducation = (educationRes.count || 0) > 0;
        const hasExperience = (experienceRes.count || 0) > 0;
        const hasSkills = (skillsRes.count || 0) > 0;

        setStats({
          educationCount: educationRes.count || 0,
          experienceCount: experienceRes.count || 0,
          skillsCount: skillsRes.count || 0,
          assessmentsCompleted: assessmentRes.count || 0,
          profileComplete: hasEducation && hasSkills && hasCareerGoal,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const profileProgress = [
    stats.educationCount > 0,
    stats.experienceCount > 0,
    stats.skillsCount > 0,
    stats.profileComplete,
  ].filter(Boolean).length * 25;

  if (role === "admin") {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage users, job roles, skills, and assessments
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Job Roles</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Defined roles</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Skills Catalog</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Total skills</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Active assessments</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
                <Link to="/admin/job-roles">
                  <Briefcase className="h-5 w-5" />
                  <span>Add Job Role</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
                <Link to="/admin/skills">
                  <Target className="h-5 w-5" />
                  <span>Add Skill</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
                <Link to="/admin/assessments">
                  <ClipboardCheck className="h-5 w-5" />
                  <span>Create Assessment</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {firstName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your skills, identify gaps, and grow your career
          </p>
        </div>

        {/* Profile Completion Alert */}
        {!stats.profileComplete && !loading && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-5 w-5 text-warning shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Complete your profile</p>
                <p className="text-sm text-muted-foreground">
                  Add your education, experience, and skills to get personalized recommendations
                </p>
              </div>
              <Button asChild size="sm">
                <Link to="/profile">Complete Profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Profile Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{profileProgress}%</span>
              </div>
              <Progress value={profileProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Education</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.educationCount}</div>
              <p className="text-xs text-muted-foreground">Qualifications added</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Experience</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.experienceCount}</div>
              <p className="text-xs text-muted-foreground">Work experiences</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Skills</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.skillsCount}</div>
              <p className="text-xs text-muted-foreground">Skills tracked</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Assessments</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assessmentsCompleted}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="group hover:shadow-md transition-shadow">
            <Link to="/profile">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="mt-4">Update Profile</CardTitle>
                <CardDescription>
                  Add your education, experience, and career goals
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="group hover:shadow-md transition-shadow">
            <Link to="/assessments">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="mt-4">Take Assessment</CardTitle>
                <CardDescription>
                  Test your skills and get accurate proficiency levels
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="group hover:shadow-md transition-shadow">
            <Link to="/skill-gap">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="mt-4">Analyze Skill Gaps</CardTitle>
                <CardDescription>
                  Compare your skills against your target job role
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
