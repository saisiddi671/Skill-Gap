import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, GraduationCap, Briefcase, Target, Rocket } from "lucide-react";
import PersonalInfoForm from "@/components/profile/PersonalInfoForm";
import EducationSection from "@/components/profile/EducationSection";
import ExperienceSection from "@/components/profile/ExperienceSection";
import SkillsSection from "@/components/profile/SkillsSection";
import CareerGoalsSection from "@/components/profile/CareerGoalsSection";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
}

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal information, education, experience, and career goals
          </p>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4 hidden sm:block" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="education" className="gap-2">
              <GraduationCap className="h-4 w-4 hidden sm:block" />
              Education
            </TabsTrigger>
            <TabsTrigger value="experience" className="gap-2">
              <Briefcase className="h-4 w-4 hidden sm:block" />
              Experience
            </TabsTrigger>
            <TabsTrigger value="skills" className="gap-2">
              <Target className="h-4 w-4 hidden sm:block" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Rocket className="h-4 w-4 hidden sm:block" />
              Goals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PersonalInfoForm
                  profile={profile}
                  loading={loading}
                  onUpdate={handleProfileUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="education">
            <Card>
              <CardHeader>
                <CardTitle>Education</CardTitle>
                <CardDescription>
                  Add your academic qualifications and certifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EducationSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="experience">
            <Card>
              <CardHeader>
                <CardTitle>Work Experience</CardTitle>
                <CardDescription>
                  Add your professional experience and roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExperienceSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills">
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>
                  Manage your technical and soft skills with proficiency levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SkillsSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals">
            <Card>
              <CardHeader>
                <CardTitle>Career Goals</CardTitle>
                <CardDescription>
                  Define your target job role and career aspirations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CareerGoalsSection />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
