import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Search, ArrowRight, Users, Target, Filter } from "lucide-react";

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

const experienceLevelLabels: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior Level",
};

const experienceLevelColors: Record<string, string> = {
  entry: "bg-green-500/10 text-green-600 border-green-500/20",
  mid: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  senior: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const JobRoles = () => {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  useEffect(() => {
    const fetchJobRoles = async () => {
      try {
        const { data, error } = await supabase
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
          .order("title");

        if (error) throw error;
        setJobRoles(data || []);
      } catch (error) {
        console.error("Error fetching job roles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobRoles();
  }, []);

  // Get unique industries for filter
  const industries = [...new Set(jobRoles.map((r) => r.industry).filter(Boolean))] as string[];

  // Filter job roles
  const filteredRoles = jobRoles.filter((role) => {
    const matchesSearch =
      role.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = industryFilter === "all" || role.industry === industryFilter;
    const matchesLevel = levelFilter === "all" || role.experience_level === levelFilter;
    return matchesSearch && matchesIndustry && matchesLevel;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Roles</h1>
          <p className="text-muted-foreground mt-1">
            Explore career paths and their skill requirements
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{jobRoles.length}</p>
                <p className="text-sm text-muted-foreground">Job Roles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Set(jobRoles.flatMap((r) => r.job_role_skills.map((s) => s.skill_id))).size}
                </p>
                <p className="text-sm text-muted-foreground">Unique Skills</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{industries.length}</p>
                <p className="text-sm text-muted-foreground">Industries</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search job roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-4">
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Roles Grid */}
        {filteredRoles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No job roles found</p>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredRoles.map((role) => (
              <Card key={role.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{role.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {role.industry && (
                          <Badge variant="outline">{role.industry}</Badge>
                        )}
                        {role.experience_level && (
                          <Badge
                            variant="outline"
                            className={experienceLevelColors[role.experience_level]}
                          >
                            {experienceLevelLabels[role.experience_level] || role.experience_level}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2 line-clamp-2">
                    {role.description || "Explore the skills needed for this role"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Required Skills Preview */}
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Required Skills ({role.job_role_skills.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {role.job_role_skills.slice(0, 6).map((skill) => (
                        <Badge key={skill.skill_id} variant="secondary" className="text-xs">
                          {skill.skills.name}
                        </Badge>
                      ))}
                      {role.job_role_skills.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.job_role_skills.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button asChild className="w-full group-hover:bg-primary">
                    <Link to={`/job-roles/${role.id}`}>
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default JobRoles;