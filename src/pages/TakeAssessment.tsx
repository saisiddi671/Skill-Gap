import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2, Trophy, ArrowLeft } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  time_limit_minutes: number | null;
  skills: { name: string } | null;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string | null;
  options: Json;
  correct_answer: string | null;
  points: number | null;
  order_index: number | null;
}

const TakeAssessment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    level: string;
  } | null>(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!id) return;

      try {
        const { data: assessmentData, error: assessmentError } = await supabase
          .from("assessments")
          .select(`
            id,
            title,
            description,
            difficulty,
            time_limit_minutes,
            skills (name)
          `)
          .eq("id", id)
          .single();

        if (assessmentError) throw assessmentError;
        setAssessment(assessmentData);

        const { data: questionsData, error: questionsError } = await supabase
          .from("assessment_questions")
          .select("*")
          .eq("assessment_id", id)
          .order("order_index", { ascending: true });

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);
      } catch (error) {
        console.error("Error fetching assessment:", error);
        toast({
          title: "Error",
          description: "Failed to load assessment",
          variant: "destructive",
        });
        navigate("/assessments");
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id, navigate, toast]);

  // Timer logic
  useEffect(() => {
    if (!started || timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeLeft]);

  const handleStart = () => {
    setStarted(true);
    if (assessment?.time_limit_minutes) {
      setTimeLeft(assessment.time_limit_minutes * 60);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const calculateLevel = (percentage: number): string => {
    if (percentage >= 90) return "advanced";
    if (percentage >= 70) return "intermediate";
    return "beginner";
  };

  const handleSubmit = useCallback(async () => {
    if (!user || !assessment || submitting) return;

    setSubmitting(true);
    try {
      let score = 0;
      const maxScore = questions.reduce((sum, q) => sum + (q.points || 1), 0);

      questions.forEach((question) => {
        const userAnswer = answers[question.id];
        if (userAnswer && userAnswer === question.correct_answer) {
          score += question.points || 1;
        }
      });

      const percentage = Math.round((score / maxScore) * 100);
      const level = calculateLevel(percentage);

      // Save result to database
      const { error } = await supabase.from("assessment_results").insert({
        user_id: user.id,
        assessment_id: assessment.id,
        score,
        max_score: maxScore,
        percentage,
        calculated_level: level,
        answers: answers as unknown as Json,
      });

      if (error) throw error;

      // Update user skill if assessment is linked to a skill
      if (assessment.skills) {
        const { data: existingSkill } = await supabase
          .from("skills")
          .select("id")
          .eq("name", assessment.skills.name)
          .single();

        if (existingSkill) {
          const { data: userSkill } = await supabase
            .from("user_skills")
            .select("id")
            .eq("user_id", user.id)
            .eq("skill_id", existingSkill.id)
            .single();

          if (userSkill) {
            await supabase
              .from("user_skills")
              .update({ proficiency_level: level })
              .eq("id", userSkill.id);
          }
        }
      }

      setResult({ score, maxScore, percentage, level });
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast({
        title: "Error",
        description: "Failed to submit assessment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  }, [user, assessment, questions, answers, submitting, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
        </div>
      </DashboardLayout>
    );
  }

  if (!assessment || questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium">Assessment not available</p>
              <p className="text-muted-foreground mb-4">This assessment has no questions yet</p>
              <Button onClick={() => navigate("/assessments")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Assessments
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show results
  if (result) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
              <CardDescription>{assessment.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3 text-center">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{result.score}/{result.maxScore}</p>
                  <p className="text-sm text-muted-foreground">Score</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{result.percentage}%</p>
                  <p className="text-sm text-muted-foreground">Percentage</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <Badge className="text-lg px-4 py-1" variant="secondary">
                    {result.level}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">Proficiency</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/assessments")}>
                  Back to Assessments
                </Button>
                <Button className="flex-1" onClick={() => navigate("/skill-gap")}>
                  View Skill Gap
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Start screen
  if (!started) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/assessments")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assessments
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>{assessment.title}</CardTitle>
              <CardDescription>{assessment.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{questions.length}</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{assessment.time_limit_minutes || "∞"}</p>
                  <p className="text-sm text-muted-foreground">Minutes</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <Badge variant="outline" className="text-base">
                    {assessment.difficulty || "Mixed"}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">Difficulty</p>
                </div>
              </div>

              <div className="bg-muted/30 border rounded-lg p-4 space-y-2">
                <p className="font-medium">Instructions:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Read each question carefully before answering</li>
                  <li>You can navigate between questions using the buttons</li>
                  {assessment.time_limit_minutes && (
                    <li>You have {assessment.time_limit_minutes} minutes to complete the test</li>
                  )}
                  <li>Your proficiency level will be calculated based on your score</li>
                </ul>
              </div>

              <Button onClick={handleStart} className="w-full" size="lg">
                Start Assessment
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Question screen
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{assessment.title}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          {timeLeft !== null && (
            <Badge
              variant="outline"
              className={`text-lg px-3 py-1 ${
                timeLeft < 60 ? "bg-red-500/10 text-red-600 border-red-500/20" : ""
              }`}
            >
              <Clock className="h-4 w-4 mr-1" />
              {formatTime(timeLeft)}
            </Badge>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{answeredCount} answered</span>
            <span>{questions.length - answeredCount} remaining</span>
          </div>
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{currentQuestion.question_text}</CardTitle>
              <Badge variant="outline">{currentQuestion.points || 1} pts</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
            >
              {Array.isArray(currentQuestion.options) &&
                (currentQuestion.options as string[]).map((option, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      answers[currentQuestion.id] === option
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleAnswer(currentQuestion.id, option)}
                  >
                    <RadioGroupItem value={option} id={`option-${idx}`} />
                    <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                    {answers[currentQuestion.id] === option && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button variant="destructive" onClick={() => setShowSubmitDialog(true)}>
            <Flag className="mr-2 h-4 w-4" />
            Submit ({answeredCount}/{questions.length})
          </Button>

          <Button
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            disabled={currentIndex === questions.length - 1}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Question Navigator */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Question Navigator</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-2">
              {questions.map((q, idx) => (
                <Button
                  key={q.id}
                  variant={currentIndex === idx ? "default" : answers[q.id] ? "secondary" : "outline"}
                  size="sm"
                  className="w-10 h-10"
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Dialog */}
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
              <AlertDialogDescription>
                You have answered {answeredCount} out of {questions.length} questions.
                {answeredCount < questions.length && (
                  <span className="block mt-2 text-yellow-600">
                    Warning: You have {questions.length - answeredCount} unanswered questions.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Test</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Now"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default TakeAssessment;