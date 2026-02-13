import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target } from "lucide-react";
import type { UserSkillWithDetails } from "@/hooks/useProgressData";

interface SkillsOverviewProps {
  userSkills: UserSkillWithDetails[];
  loading: boolean;
}

const proficiencyToPercent: Record<string, number> = {
  beginner: 33,
  intermediate: 66,
  advanced: 100,
};

const proficiencyColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const SkillsOverview = ({ userSkills, loading }: SkillsOverviewProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (userSkills.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No skills added yet</h3>
          <p className="text-muted-foreground max-w-md">
            Add skills to your profile to track your proficiency levels and growth.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group skills by category
  const grouped = userSkills.reduce<Record<string, UserSkillWithDetails[]>>((acc, skill) => {
    const cat = skill.skills.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Skills Overview
        </CardTitle>
        <CardDescription>Your current skill proficiencies by category</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(grouped).map(([category, skills]) => (
          <div key={category} className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {category}
            </h4>
            <div className="space-y-3">
              {skills.map((skill) => {
                const level = skill.proficiency_level.toLowerCase();
                const percent = proficiencyToPercent[level] || 0;
                return (
                  <div key={skill.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{skill.skills.name}</span>
                      <div className="flex items-center gap-2">
                        {skill.years_of_experience != null && skill.years_of_experience > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {skill.years_of_experience}yr{skill.years_of_experience !== 1 ? "s" : ""}
                          </span>
                        )}
                        <Badge className={`text-xs ${proficiencyColors[level] || "bg-muted"}`}>
                          {skill.proficiency_level}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SkillsOverview;
