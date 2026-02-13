-- Add new columns to assessment_questions for code questions
ALTER TABLE public.assessment_questions 
ADD COLUMN IF NOT EXISTS code_template TEXT,
ADD COLUMN IF NOT EXISTS test_cases JSONB,
ADD COLUMN IF NOT EXISTS expected_output TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'javascript';

-- Create table for AI-generated adaptive assessments
CREATE TABLE IF NOT EXISTS public.adaptive_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
    difficulty_level TEXT NOT NULL DEFAULT 'intermediate',
    questions JSONB NOT NULL,
    answers JSONB,
    score INTEGER,
    max_score INTEGER,
    percentage INTEGER,
    calculated_level TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.adaptive_assessments ENABLE ROW LEVEL SECURITY;

-- RLS policies for adaptive_assessments
CREATE POLICY "Users can view their own adaptive assessments"
ON public.adaptive_assessments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own adaptive assessments"
ON public.adaptive_assessments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own adaptive assessments"
ON public.adaptive_assessments FOR UPDATE
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_adaptive_assessments_user_skill 
ON public.adaptive_assessments(user_id, skill_id);