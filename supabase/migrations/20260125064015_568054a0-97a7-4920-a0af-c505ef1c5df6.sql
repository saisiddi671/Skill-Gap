-- Create app_role enum for role-based access
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Education records
CREATE TABLE public.education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    degree TEXT NOT NULL,
    field_of_study TEXT NOT NULL,
    institution TEXT NOT NULL,
    start_year INTEGER,
    end_year INTEGER,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Work experience records
CREATE TABLE public.work_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    industry TEXT,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Skills master catalog
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User skills (self-reported)
CREATE TABLE public.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
    proficiency_level TEXT NOT NULL DEFAULT 'beginner',
    years_of_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, skill_id)
);

-- Career goals
CREATE TABLE public.career_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    target_job_role TEXT,
    target_industry TEXT,
    timeline TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Job roles catalog
CREATE TABLE public.job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL UNIQUE,
    description TEXT,
    industry TEXT,
    experience_level TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Job role required skills
CREATE TABLE public.job_role_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_role_id UUID REFERENCES public.job_roles(id) ON DELETE CASCADE NOT NULL,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
    required_proficiency TEXT NOT NULL DEFAULT 'intermediate',
    importance TEXT DEFAULT 'required',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (job_role_id, skill_id)
);

-- Assessments
CREATE TABLE public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
    difficulty TEXT DEFAULT 'intermediate',
    time_limit_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessment questions
CREATE TABLE public.assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'mcq',
    options JSONB,
    correct_answer TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessment results
CREATE TABLE public.assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2),
    calculated_level TEXT,
    answers JSONB,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recommendations
CREATE TABLE public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL,
    url TEXT,
    provider TEXT,
    difficulty TEXT,
    duration TEXT,
    is_free BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_role_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'));
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile and role on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_education_updated_at BEFORE UPDATE ON public.education FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_work_experience_updated_at BEFORE UPDATE ON public.work_experience FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_skills_updated_at BEFORE UPDATE ON public.user_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_career_goals_updated_at BEFORE UPDATE ON public.career_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_job_roles_updated_at BEFORE UPDATE ON public.job_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_roles (read own, admins can read all)
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for education
CREATE POLICY "Users can view their own education" ON public.education FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own education" ON public.education FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own education" ON public.education FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own education" ON public.education FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for work_experience
CREATE POLICY "Users can view their own work experience" ON public.work_experience FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own work experience" ON public.work_experience FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own work experience" ON public.work_experience FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own work experience" ON public.work_experience FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for skills (public read)
CREATE POLICY "Anyone can view skills" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage skills" ON public.skills FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_skills
CREATE POLICY "Users can view their own skills" ON public.user_skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own skills" ON public.user_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own skills" ON public.user_skills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own skills" ON public.user_skills FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for career_goals
CREATE POLICY "Users can view their own career goals" ON public.career_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own career goals" ON public.career_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own career goals" ON public.career_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own career goals" ON public.career_goals FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for job_roles (public read)
CREATE POLICY "Anyone can view job roles" ON public.job_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage job roles" ON public.job_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for job_role_skills (public read)
CREATE POLICY "Anyone can view job role skills" ON public.job_role_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage job role skills" ON public.job_role_skills FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for assessments (public read active)
CREATE POLICY "Anyone can view active assessments" ON public.assessments FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage assessments" ON public.assessments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for assessment_questions
CREATE POLICY "Anyone can view questions for active assessments" ON public.assessment_questions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.assessments WHERE id = assessment_id AND is_active = true)
);
CREATE POLICY "Admins can manage questions" ON public.assessment_questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for assessment_results
CREATE POLICY "Users can view their own results" ON public.assessment_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own results" ON public.assessment_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all results" ON public.assessment_results FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for recommendations (public read)
CREATE POLICY "Anyone can view recommendations" ON public.recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage recommendations" ON public.recommendations FOR ALL USING (public.has_role(auth.uid(), 'admin'));