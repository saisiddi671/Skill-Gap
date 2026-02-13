import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdaptiveQuestionCard, { AdaptiveQuestion } from "@/components/assessment/AdaptiveQuestionCard";
import { 
  Brain, 
  Sparkles, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Trophy,
  Loader2,
  Zap
} from "lucide-react";

interface UserSkill {
  id: string;
  skill_id: string;
  proficiency_level: string;
  skills: {
    id: string;
    name: string;
    category: string;
  };
}

const AdaptiveAssessment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("intermediate");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<AdaptiveQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    level: string;
  } | null>(null);

  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("user_skills")
          .select(`
            id,
            skill_id,
            proficiency_level,
            skills (id, name, category)
          `)
          .eq("user_id", user.id);

        if (error) throw error;
        setUserSkills(data as UserSkill[] || []);
        
        // Auto-select first skill if available
        if (data && data.length > 0) {
          setSelectedSkillId(data[0].skill_id);
          setDifficulty(data[0].proficiency_level);
        }
      } catch (error) {
        console.error("Error fetching skills:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSkills();
  }, [user]);

  const generateAssessment = async () => {
    const selectedSkill = userSkills.find(s => s.skill_id === selectedSkillId);
    if (!selectedSkill) return;

    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-assessment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            skillName: selectedSkill.skills.name,
            skillCategory: selectedSkill.skills.category,
            proficiencyLevel: difficulty,
            questionCount: 5,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate assessment");
      }

      const data = await response.json();
      setQuestions(data.questions);
      setAnswers({});
      setCodeAnswers({});
      setCurrentIndex(0);
      setSubmitted(false);
      setResult(null);

      toast({
        title: "Assessment Generated!",
        description: `${data.questions.length} ${difficulty}-level questions for ${selectedSkill.skills.name}`,
      });
    } catch (error) {
      console.error("Error generating assessment:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate assessment",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (index: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [index]: answer }));
  };

  const handleCodeAnswer = (index: number, code: string) => {
    setCodeAnswers(prev => ({ ...prev, [index]: code }));
  };

  const calculateScore = () => {
    let score = 0;
    let maxScore = 0;

    questions.forEach((q, idx) => {
      maxScore += q.points;
      const userAnswer = answers[idx];
      
      if (q.question_type === "code_challenge") {
        // For code challenges, we stored "correct" or "incorrect"
        if (userAnswer === "correct") {
          score += q.points;
        }
      } else {
        // For MCQ and code_output
        if (userAnswer === q.correct_answer) {
          score += q.points;
        }
      }
    });

    return { score, maxScore };
  };

  const handleSubmit = async () => {
    const { score, maxScore } = calculateScore();
    const percentage = Math.round((score / maxScore) * 100);
    
    let level: string;
    if (percentage >= 90) level = "advanced";
    else if (percentage >= 70) level = "intermediate";
    else level = "beginner";

    setResult({ score, maxScore, percentage, level });
    setSubmitted(true);

    // Save to database
    if (user && selectedSkillId) {
      try {
        const insertData = {
          user_id: user.id,
          skill_id: selectedSkillId,
          difficulty_level: difficulty,
          questions: questions as unknown as Json,
          answers: answers as unknown as Json,
          score,
          max_score: maxScore,
          percentage,
          calculated_level: level,
          completed_at: new Date().toISOString(),
        };
        
        await supabase.from("adaptive_assessments").insert(insertData);

        // Update user skill level if improved
        const currentSkill = userSkills.find(s => s.skill_id === selectedSkillId);
        const proficiencyOrder = ["beginner", "intermediate", "advanced"];
        const currentLevel = currentSkill?.proficiency_level || "beginner";
        
        if (proficiencyOrder.indexOf(level) > proficiencyOrder.indexOf(currentLevel)) {
          await supabase
            .from("user_skills")
            .update({ proficiency_level: level })
            .eq("skill_id", selectedSkillId)
            .eq("user_id", user.id);

          toast({
            title: "Skill Level Updated!",
            description: `Your ${currentSkill?.skills.name} level is now ${level}`,
          });
        }
      } catch (error) {
        console.error("Error saving result:", error);
      }
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
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

  // No skills - prompt to add some
  if (userSkills.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No Skills Found</p>
              <p className="text-muted-foreground mb-4 text-center">
                Add skills to your profile first to take adaptive assessments
              </p>
              <Button onClick={() => navigate("/profile")}>
                Go to Profile
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
              <CardDescription>
                AI-Generated {difficulty} assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3 text-center">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold text-primary">
                    {result.score}/{result.maxScore}
                  </p>
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

              {/* Review answers */}
              <div className="space-y-4">
                <h3 className="font-medium">Review Your Answers</h3>
                {questions.map((q, idx) => (
                  <AdaptiveQuestionCard
                    key={idx}
                    question={q}
                    questionNumber={idx + 1}
                    answer={answers[idx]}
                    codeAnswer={codeAnswers[idx]}
                    onAnswer={() => {}}
                    onCodeAnswer={() => {}}
                    showResult
                  />
                ))}
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setQuestions([]);
                    setResult(null);
                    setSubmitted(false);
                  }}
                >
                  Try Another
                </Button>
                <Button className="flex-1" onClick={() => navigate("/assessments")}>
                  Back to Assessments
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Setup screen
  if (questions.length === 0) {
    const selectedSkill = userSkills.find(s => s.skill_id === selectedSkillId);

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/assessments")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assessments
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <Badge variant="secondary">AI-Powered</Badge>
              </div>
              <CardTitle>Adaptive Skill Assessment</CardTitle>
              <CardDescription>
                Generate personalized questions based on your skill level using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Skill</label>
                  <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {userSkills.map((skill) => (
                        <SelectItem key={skill.skill_id} value={skill.skill_id}>
                          {skill.skills.name} ({skill.proficiency_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty Level</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSkill && (
                <div className="bg-muted/30 border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <p className="font-medium">{selectedSkill.skills.name}</p>
                    <Badge variant="outline">{selectedSkill.skills.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Current level: <span className="font-medium">{selectedSkill.proficiency_level}</span>
                  </p>
                </div>
              )}

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <p className="font-medium text-sm">What to expect:</p>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>5 AI-generated questions tailored to your level</li>
                  <li>Mix of multiple choice and coding challenges</li>
                  <li>Code output prediction questions</li>
                  <li>Instant feedback and explanations</li>
                </ul>
              </div>

              <Button 
                onClick={generateAssessment} 
                className="w-full gap-2" 
                size="lg"
                disabled={!selectedSkillId || generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Assessment
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Assessment in progress
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <Badge variant="secondary" className="text-xs">AI-Generated</Badge>
            </div>
            <h1 className="text-xl font-semibold">Adaptive Assessment</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {difficulty}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{answeredCount} answered</span>
            <span>{questions.length - answeredCount} remaining</span>
          </div>
        </div>

        {/* Current Question */}
        <AdaptiveQuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          answer={answers[currentIndex]}
          codeAnswer={codeAnswers[currentIndex]}
          onAnswer={(answer) => handleAnswer(currentIndex, answer)}
          onCodeAnswer={(code) => handleCodeAnswer(currentIndex, code)}
        />

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

          {currentIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={answeredCount < questions.length}>
              Submit Assessment
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex((prev) => prev + 1)}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Question Navigator */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Question Navigator</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-2">
              {questions.map((_, idx) => (
                <Button
                  key={idx}
                  variant={currentIndex === idx ? "default" : answers[idx] ? "secondary" : "outline"}
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
      </div>
    </DashboardLayout>
  );
};

export default AdaptiveAssessment;
