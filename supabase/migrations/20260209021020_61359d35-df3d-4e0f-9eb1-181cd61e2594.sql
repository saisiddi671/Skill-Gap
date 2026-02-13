
-- Learning Paths: curated sequences from basics to advanced
CREATE TABLE public.learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  difficulty_start TEXT NOT NULL DEFAULT 'beginner',
  difficulty_end TEXT NOT NULL DEFAULT 'advanced',
  estimated_hours NUMERIC,
  is_published BOOLEAN NOT NULL DEFAULT false,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published learning paths"
  ON public.learning_paths FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage learning paths"
  ON public.learning_paths FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_learning_paths_updated_at
  BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Learning Modules: chapters within a path
CREATE TABLE public.learning_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view modules of published paths"
  ON public.learning_modules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.learning_paths
    WHERE learning_paths.id = learning_modules.path_id
    AND learning_paths.is_published = true
  ));

CREATE POLICY "Admins can manage learning modules"
  ON public.learning_modules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_learning_modules_updated_at
  BEFORE UPDATE ON public.learning_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Learning Lessons: individual content pages within modules
CREATE TABLE public.learning_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons of published paths"
  ON public.learning_lessons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.learning_modules
    JOIN public.learning_paths ON learning_paths.id = learning_modules.path_id
    WHERE learning_modules.id = learning_lessons.module_id
    AND learning_paths.is_published = true
  ));

CREATE POLICY "Admins can manage learning lessons"
  ON public.learning_lessons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_learning_lessons_updated_at
  BEFORE UPDATE ON public.learning_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User Learning Progress: track completion
CREATE TABLE public.user_learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.user_learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON public.user_learning_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_learning_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
  ON public.user_learning_progress FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.user_learning_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
