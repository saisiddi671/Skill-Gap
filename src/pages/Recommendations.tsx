 import { useEffect, useState } from "react";
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import DashboardLayout from "@/components/layout/DashboardLayout";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Skeleton } from "@/components/ui/skeleton";
 import { 
   BookOpen, 
   Video, 
   FileText, 
   GraduationCap, 
   ExternalLink,
   Clock,
   Star,
   Filter,
   Target,
   TrendingUp
 } from "lucide-react";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 
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
 
 interface Recommendation {
   id: string;
   title: string;
   description: string | null;
   resource_type: string;
   provider: string | null;
   url: string | null;
   difficulty: string | null;
   duration: string | null;
   is_free: boolean | null;
   skill_id: string | null;
   skills?: Skill | null;
 }
 
 interface SkillGap {
   skill: Skill;
   requiredLevel: string;
   currentLevel: string | null;
   gapSeverity: "missing" | "partial" | "met";
 }
 
 const resourceTypeIcons: Record<string, React.ReactNode> = {
   course: <Video className="h-4 w-4" />,
   tutorial: <BookOpen className="h-4 w-4" />,
   book: <BookOpen className="h-4 w-4" />,
   documentation: <FileText className="h-4 w-4" />,
   certification: <GraduationCap className="h-4 w-4" />,
 };
 
 const difficultyColors: Record<string, string> = {
   beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
   intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
   advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
 };
 
 const Recommendations = () => {
   const { user } = useAuth();
   const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
   const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
   const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
   const [loading, setLoading] = useState(true);
   const [filterType, setFilterType] = useState<string>("all");
   const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
   const [filterFree, setFilterFree] = useState<string>("all");
 
   useEffect(() => {
     const fetchData = async () => {
       if (!user) return;
 
       try {
         // Fetch user's skills
         const { data: userSkillsData, error: userSkillsError } = await supabase
           .from("user_skills")
           .select(`
             skill_id,
             proficiency_level,
             skills (id, name, category)
           `)
           .eq("user_id", user.id);
 
         if (userSkillsError) throw userSkillsError;
         setUserSkills(userSkillsData as unknown as UserSkill[] || []);
 
         // Fetch career goals to get target job role
         const { data: careerGoal } = await supabase
           .from("career_goals")
           .select("target_job_role")
           .eq("user_id", user.id)
           .maybeSingle();
 
         // Fetch job role skills if career goal exists
         let requiredSkillIds: string[] = [];
         if (careerGoal?.target_job_role) {
           const { data: jobRole } = await supabase
             .from("job_roles")
             .select("id")
             .ilike("title", `%${careerGoal.target_job_role}%`)
             .maybeSingle();
 
           if (jobRole) {
             const { data: jobRoleSkills } = await supabase
               .from("job_role_skills")
               .select(`
                 skill_id,
                 required_proficiency,
                 skills (id, name, category)
               `)
               .eq("job_role_id", jobRole.id);
 
             if (jobRoleSkills) {
               const userSkillMap = new Map(
                 (userSkillsData || []).map((us: any) => [us.skill_id, us.proficiency_level])
               );
 
               const gaps: SkillGap[] = jobRoleSkills.map((jrs: any) => {
                 const currentLevel = userSkillMap.get(jrs.skill_id) || null;
                 const levelOrder = ["beginner", "intermediate", "advanced"];
                 const currentIndex = currentLevel ? levelOrder.indexOf(currentLevel.toLowerCase()) : -1;
                 const requiredIndex = levelOrder.indexOf(jrs.required_proficiency.toLowerCase());
 
                 let gapSeverity: "missing" | "partial" | "met" = "missing";
                 if (currentIndex >= requiredIndex) {
                   gapSeverity = "met";
                 } else if (currentIndex >= 0) {
                   gapSeverity = "partial";
                 }
 
                 return {
                   skill: jrs.skills,
                   requiredLevel: jrs.required_proficiency,
                   currentLevel,
                   gapSeverity,
                 };
               });
 
               setSkillGaps(gaps.filter((g) => g.gapSeverity !== "met"));
               requiredSkillIds = jobRoleSkills.map((jrs: any) => jrs.skill_id);
             }
           }
         }
 
         // Fetch all recommendations
         const { data: recsData, error: recsError } = await supabase
           .from("recommendations")
           .select(`
             *,
             skills (id, name, category)
           `);
 
         if (recsError) throw recsError;
         setRecommendations(recsData as unknown as Recommendation[] || []);
       } catch (error) {
         console.error("Error fetching recommendations:", error);
       } finally {
         setLoading(false);
       }
     };
 
     fetchData();
   }, [user]);
 
   // Filter recommendations based on skill gaps first, then user filters
   const getFilteredRecommendations = () => {
     let filtered = [...recommendations];
 
     // Apply type filter
     if (filterType !== "all") {
       filtered = filtered.filter((r) => r.resource_type === filterType);
     }
 
     // Apply difficulty filter
     if (filterDifficulty !== "all") {
       filtered = filtered.filter((r) => r.difficulty === filterDifficulty);
     }
 
     // Apply free filter
     if (filterFree !== "all") {
       filtered = filtered.filter((r) => 
         filterFree === "free" ? r.is_free : !r.is_free
       );
     }
 
     return filtered;
   };
 
   // Get personalized recommendations based on skill gaps
   const getPersonalizedRecommendations = () => {
     const gapSkillIds = skillGaps.map((g) => g.skill.id);
     return getFilteredRecommendations().filter((r) => 
       r.skill_id && gapSkillIds.includes(r.skill_id)
     );
   };
 
   // Get recommendations for skills the user already has
   const getGrowthRecommendations = () => {
     const userSkillIds = userSkills.map((us) => us.skill_id);
     return getFilteredRecommendations().filter((r) => 
       r.skill_id && userSkillIds.includes(r.skill_id)
     );
   };
 
   const renderRecommendationCard = (rec: Recommendation) => (
     <Card key={rec.id} className="group hover:shadow-md transition-all">
       <CardHeader className="pb-3">
         <div className="flex items-start justify-between gap-4">
           <div className="flex items-center gap-2">
             <div className="p-2 rounded-lg bg-primary/10">
               {resourceTypeIcons[rec.resource_type] || <BookOpen className="h-4 w-4" />}
             </div>
             <div>
               <CardTitle className="text-base leading-tight">{rec.title}</CardTitle>
               {rec.provider && (
                 <p className="text-sm text-muted-foreground">{rec.provider}</p>
               )}
             </div>
           </div>
           {rec.is_free && (
             <Badge variant="secondary" className="shrink-0">Free</Badge>
           )}
         </div>
       </CardHeader>
       <CardContent className="space-y-4">
         {rec.description && (
           <p className="text-sm text-muted-foreground line-clamp-2">
             {rec.description}
           </p>
         )}
         
         <div className="flex flex-wrap gap-2">
           {rec.skills && (
             <Badge variant="outline" className="gap-1">
               <Target className="h-3 w-3" />
               {rec.skills.name}
             </Badge>
           )}
           {rec.difficulty && (
             <Badge className={difficultyColors[rec.difficulty] || "bg-muted"}>
               {rec.difficulty.charAt(0).toUpperCase() + rec.difficulty.slice(1)}
             </Badge>
           )}
           {rec.duration && (
             <Badge variant="outline" className="gap-1">
               <Clock className="h-3 w-3" />
               {rec.duration}
             </Badge>
           )}
         </div>
 
         {rec.url && (
           <Button 
             variant="outline" 
             size="sm" 
             className="w-full gap-2"
             asChild
           >
             <a href={rec.url}>
               <ExternalLink className="h-4 w-4" />
               View Resource
             </a>
           </Button>
         )}
       </CardContent>
     </Card>
   );
 
   const personalizedRecs = getPersonalizedRecommendations();
   const growthRecs = getGrowthRecommendations();
   const allFilteredRecs = getFilteredRecommendations();
 
   return (
     <DashboardLayout>
       <div className="space-y-6">
         <div>
           <h1 className="text-3xl font-bold text-foreground">Learning Recommendations</h1>
           <p className="text-muted-foreground mt-1">
             Personalized resources to help you bridge skill gaps and advance your career
           </p>
         </div>
 
         {/* Skill Gaps Summary */}
         {skillGaps.length > 0 && (
           <Card className="border-primary/20 bg-primary/5">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-lg">
                 <TrendingUp className="h-5 w-5 text-primary" />
                 Your Skill Gaps
               </CardTitle>
               <CardDescription>
                 Based on your career goals, focus on these skills to improve
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="flex flex-wrap gap-2">
                 {skillGaps.map((gap) => (
                   <Badge
                     key={gap.skill.id}
                     variant={gap.gapSeverity === "missing" ? "destructive" : "secondary"}
                     className="gap-1"
                   >
                     {gap.skill.name}
                     <span className="text-xs opacity-75">
                       ({gap.currentLevel || "Not started"} → {gap.requiredLevel})
                     </span>
                   </Badge>
                 ))}
               </div>
             </CardContent>
           </Card>
         )}
 
         {/* Filters */}
         <Card>
           <CardContent className="pt-6">
             <div className="flex flex-wrap gap-4 items-center">
               <div className="flex items-center gap-2">
                 <Filter className="h-4 w-4 text-muted-foreground" />
                 <span className="text-sm font-medium">Filters:</span>
               </div>
               
               <Select value={filterType} onValueChange={setFilterType}>
                 <SelectTrigger className="w-[140px]">
                   <SelectValue placeholder="Type" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Types</SelectItem>
                   <SelectItem value="course">Courses</SelectItem>
                   <SelectItem value="tutorial">Tutorials</SelectItem>
                   <SelectItem value="book">Books</SelectItem>
                   <SelectItem value="documentation">Docs</SelectItem>
                 </SelectContent>
               </Select>
 
               <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                 <SelectTrigger className="w-[140px]">
                   <SelectValue placeholder="Difficulty" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Levels</SelectItem>
                   <SelectItem value="beginner">Beginner</SelectItem>
                   <SelectItem value="intermediate">Intermediate</SelectItem>
                   <SelectItem value="advanced">Advanced</SelectItem>
                 </SelectContent>
               </Select>
 
               <Select value={filterFree} onValueChange={setFilterFree}>
                 <SelectTrigger className="w-[120px]">
                   <SelectValue placeholder="Price" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All</SelectItem>
                   <SelectItem value="free">Free Only</SelectItem>
                   <SelectItem value="paid">Paid Only</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </CardContent>
         </Card>
 
         {/* Recommendations Tabs */}
         <Tabs defaultValue="personalized" className="space-y-6">
           <TabsList>
             <TabsTrigger value="personalized" className="gap-2">
               <Star className="h-4 w-4" />
               For You ({personalizedRecs.length})
             </TabsTrigger>
             <TabsTrigger value="growth" className="gap-2">
               <TrendingUp className="h-4 w-4" />
               Skill Growth ({growthRecs.length})
             </TabsTrigger>
             <TabsTrigger value="all" className="gap-2">
               <BookOpen className="h-4 w-4" />
               All Resources ({allFilteredRecs.length})
             </TabsTrigger>
           </TabsList>
 
           <TabsContent value="personalized">
             {loading ? (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {[1, 2, 3].map((i) => (
                   <Card key={i}>
                     <CardHeader>
                       <Skeleton className="h-6 w-3/4" />
                       <Skeleton className="h-4 w-1/2" />
                     </CardHeader>
                     <CardContent>
                       <Skeleton className="h-20 w-full" />
                     </CardContent>
                   </Card>
                 ))}
               </div>
             ) : personalizedRecs.length > 0 ? (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {personalizedRecs.map(renderRecommendationCard)}
               </div>
             ) : (
               <Card>
                 <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                   <Star className="h-12 w-12 text-muted-foreground mb-4" />
                   <h3 className="text-lg font-semibold mb-2">No personalized recommendations yet</h3>
                   <p className="text-muted-foreground max-w-md">
                     Set your career goals and complete a skill gap analysis to get personalized learning recommendations.
                   </p>
                   <Button className="mt-4" asChild>
                     <a href="/skill-gap">Analyze Skill Gaps</a>
                   </Button>
                 </CardContent>
               </Card>
             )}
           </TabsContent>
 
           <TabsContent value="growth">
             {loading ? (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {[1, 2, 3].map((i) => (
                   <Card key={i}>
                     <CardHeader>
                       <Skeleton className="h-6 w-3/4" />
                       <Skeleton className="h-4 w-1/2" />
                     </CardHeader>
                     <CardContent>
                       <Skeleton className="h-20 w-full" />
                     </CardContent>
                   </Card>
                 ))}
               </div>
             ) : growthRecs.length > 0 ? (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {growthRecs.map(renderRecommendationCard)}
               </div>
             ) : (
               <Card>
                 <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                   <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                   <h3 className="text-lg font-semibold mb-2">Add skills to get growth recommendations</h3>
                   <p className="text-muted-foreground max-w-md">
                     Add skills to your profile to see resources that can help you level up.
                   </p>
                   <Button className="mt-4" asChild>
                     <a href="/profile">Manage Skills</a>
                   </Button>
                 </CardContent>
               </Card>
             )}
           </TabsContent>
 
           <TabsContent value="all">
             {loading ? (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {[1, 2, 3, 4, 5, 6].map((i) => (
                   <Card key={i}>
                     <CardHeader>
                       <Skeleton className="h-6 w-3/4" />
                       <Skeleton className="h-4 w-1/2" />
                     </CardHeader>
                     <CardContent>
                       <Skeleton className="h-20 w-full" />
                     </CardContent>
                   </Card>
                 ))}
               </div>
             ) : allFilteredRecs.length > 0 ? (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {allFilteredRecs.map(renderRecommendationCard)}
               </div>
             ) : (
               <Card>
                 <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                   <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                   <h3 className="text-lg font-semibold mb-2">No resources match your filters</h3>
                   <p className="text-muted-foreground">
                     Try adjusting your filters to see more recommendations.
                   </p>
                 </CardContent>
               </Card>
             )}
           </TabsContent>
         </Tabs>
       </div>
     </DashboardLayout>
   );
 };
 
 export default Recommendations;