import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Briefcase,
  Target,
  ClipboardCheck,
  LineChart,
  ChevronRight,
  FileBarChart,
  BookOpen,
} from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";

const AdminDashboard = () => {
  const { stats, loading } = useAdminData();

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: User, subtitle: "Registered users" },
    { title: "Job Roles", value: stats.totalJobRoles, icon: Briefcase, subtitle: "Defined roles" },
    { title: "Skills Catalog", value: stats.totalSkills, icon: Target, subtitle: "Total skills" },
    { title: "Assessments", value: stats.totalAssessments, icon: ClipboardCheck, subtitle: "Active assessments" },
    { title: "Recommendations", value: stats.totalRecommendations, icon: BookOpen, subtitle: "Learning resources" },
    { title: "Results", value: stats.totalAssessmentResults, icon: FileBarChart, subtitle: "Completed results" },
  ];

  const quickActions = [
    { href: "/admin/users", label: "Manage Users", icon: User, desc: "View and manage user accounts and roles" },
    { href: "/admin/job-roles", label: "Manage Job Roles", icon: Briefcase, desc: "Create and edit job roles with skill requirements" },
    { href: "/admin/skills", label: "Manage Skills", icon: Target, desc: "Add, edit, or remove skills from the catalog" },
    { href: "/admin/assessments", label: "Manage Assessments", icon: ClipboardCheck, desc: "Create and manage skill assessments" },
    { href: "/admin/recommendations", label: "Manage Recommendations", icon: BookOpen, desc: "Add and manage learning resources" },
    { href: "/admin/analytics", label: "View Analytics", icon: LineChart, desc: "Track platform usage and performance" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, job roles, skills, and assessments
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
                )}
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Card key={action.href} className="group hover:shadow-md transition-shadow">
                <Link to={action.href}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <action.icon className="h-5 w-5 text-primary" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <CardTitle className="mt-4 text-base">{action.label}</CardTitle>
                    <CardDescription>{action.desc}</CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
