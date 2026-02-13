import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  skill_id: string | null;
  difficulty_start: string;
  difficulty_end: string;
  estimated_hours: number | null;
  is_published: boolean;
  cover_image_url: string | null;
  created_at: string;
  skills?: { name: string; category: string } | null;
  modules?: LearningModule[];
}

export interface LearningModule {
  id: string;
  path_id: string;
  title: string;
  description: string | null;
  order_index: number;
  difficulty: string;
  lessons?: LearningLesson[];
}

export interface LearningLesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  order_index: number;
  estimated_minutes: number | null;
}

export interface UserProgress {
  lesson_id: string;
  path_id: string;
  completed_at: string;
}

export const useLearningPaths = () => {
  const { user } = useAuth();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPaths = async () => {
    const { data, error } = await supabase
      .from("learning_paths")
      .select("*, skills(name, category)")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPaths(data as unknown as LearningPath[]);
    }
  };

  const fetchProgress = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_learning_progress")
      .select("lesson_id, path_id, completed_at")
      .eq("user_id", user.id);
    if (data) setProgress(data);
  };

  const markLessonComplete = async (lessonId: string, pathId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("user_learning_progress")
      .upsert({ user_id: user.id, lesson_id: lessonId, path_id: pathId });
    if (!error) {
      await fetchProgress();
    }
    return error;
  };

  const unmarkLessonComplete = async (lessonId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("user_learning_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId);
    if (!error) {
      await fetchProgress();
    }
    return error;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPaths(), fetchProgress()]);
      setLoading(false);
    };
    load();
  }, [user]);

  return { paths, progress, loading, markLessonComplete, unmarkLessonComplete, refetch: fetchPaths };
};
