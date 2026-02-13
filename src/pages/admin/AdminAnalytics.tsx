import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, BarChart3, Users, ClipboardCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 67%, 53%)",
  "hsl(190, 80%, 45%)",
  "hsl(330, 67%, 53%)",
];

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [skillDistribution, setSkillDistribution] = useState<{ name: string; value: number }[]>([]);
  const [assessmentScores, setAssessmentScores] = useState<{ name: string; avgScore: number; count: number }[]>([]);
  const [topSkills, setTopSkills] = useState<{ name: string; users: number }[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [skillsRes, userSkillsRes, resultsRes, assessmentsRes] = await Promise.all([
          supabase.from("skills").select("id, name, category"),
          supabase.from("user_skills").select("skill_id"),
          supabase.from("assessment_results").select("assessment_id, percentage"),
          supabase.from("assessments").select("id, title"),
        ]);

        // Skill category distribution
        const catCounts: Record<string, number> = {};
        (skillsRes.data || []).forEach((s: any) => {
          catCounts[s.category] = (catCounts[s.category] || 0) + 1;
        });
        setSkillDistribution(Object.entries(catCounts).map(([name, value]) => ({ name, value })));

        // Top skills by user count
        const skillCounts: Record<string, number> = {};
        (userSkillsRes.data || []).forEach((us: any) => {
          skillCounts[us.skill_id] = (skillCounts[us.skill_id] || 0) + 1;
        });
        const skillMap = new Map((skillsRes.data || []).map((s: any) => [s.id, s.name]));
        const sorted = Object.entries(skillCounts)
          .map(([id, count]) => ({ name: skillMap.get(id) || id, users: count }))
          .sort((a, b) => b.users - a.users)
          .slice(0, 8);
        setTopSkills(sorted);

        // Assessment avg scores
        const assessMap = new Map((assessmentsRes.data || []).map((a: any) => [a.id, a.title]));
        const scoreAgg: Record<string, { total: number; count: number }> = {};
        (resultsRes.data || []).forEach((r: any) => {
          const name = assessMap.get(r.assessment_id) || "Unknown";
          if (!scoreAgg[name]) scoreAgg[name] = { total: 0, count: 0 };
          scoreAgg[name].total += r.percentage || 0;
          scoreAgg[name].count += 1;
        });
        setAssessmentScores(
          Object.entries(scoreAgg).map(([name, v]) => ({
            name: name.length > 20 ? name.slice(0, 20) + "…" : name,
            avgScore: Math.round(v.total / v.count),
            count: v.count,
          }))
        );
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">Platform usage and performance insights</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform usage and performance insights</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Skill Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChart className="h-5 w-5 text-primary" />
                Skill Category Distribution
              </CardTitle>
              <CardDescription>Skills grouped by category</CardDescription>
            </CardHeader>
            <CardContent>
              {skillDistribution.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={skillDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                      {skillDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Skills by Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-primary" />
                Most Popular Skills
              </CardTitle>
              <CardDescription>Skills with the most users</CardDescription>
            </CardHeader>
            <CardContent>
              {topSkills.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topSkills} layout="vertical" margin={{ left: 20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={100} className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                    <Bar dataKey="users" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Assessment Average Scores */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-primary" />
                Assessment Performance
              </CardTitle>
              <CardDescription>Average scores across assessments</CardDescription>
            </CardHeader>
            <CardContent>
              {assessmentScores.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No assessment results yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={assessmentScores} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} formatter={(value: number) => [`${value}%`, "Avg Score"]} />
                    <Bar dataKey="avgScore" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
