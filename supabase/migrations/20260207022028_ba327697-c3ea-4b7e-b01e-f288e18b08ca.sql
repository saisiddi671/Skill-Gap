-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all assessment results for analytics
CREATE POLICY "Admins can view all assessment results"
ON public.assessment_results
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage assessments (delete)
CREATE POLICY "Admins can delete assessments"
ON public.assessments
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage skills (delete)
CREATE POLICY "Admins can delete skills"
ON public.skills
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage job roles (delete)  
CREATE POLICY "Admins can delete job roles"
ON public.job_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));