import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import CodeEditor from "./CodeEditor";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface TestCase {
  input: string;
  expected: string;
}

export interface AdaptiveQuestion {
  question_type: "mcq" | "code_output" | "code_challenge";
  question_text: string;
  options?: string[];
  correct_answer: string;
  code_template?: string;
  expected_output?: string;
  test_cases?: TestCase[];
  points: number;
  explanation?: string;
}

interface AdaptiveQuestionCardProps {
  question: AdaptiveQuestion;
  questionNumber: number;
  answer: string | undefined;
  codeAnswer: string | undefined;
  onAnswer: (answer: string) => void;
  onCodeAnswer: (code: string) => void;
  showResult?: boolean;
}

const AdaptiveQuestionCard = ({
  question,
  questionNumber,
  answer,
  codeAnswer,
  onAnswer,
  onCodeAnswer,
  showResult = false,
}: AdaptiveQuestionCardProps) => {
  const [codeValidated, setCodeValidated] = useState(false);
  const [codeCorrect, setCodeCorrect] = useState(false);

  const handleCodeValidation = (result: { isCorrect: boolean }) => {
    setCodeValidated(true);
    setCodeCorrect(result.isCorrect);
    // For code challenges, we store "correct" or "incorrect" as the answer
    onAnswer(result.isCorrect ? "correct" : "incorrect");
  };

  const getQuestionTypeLabel = () => {
    switch (question.question_type) {
      case "mcq":
        return "Multiple Choice";
      case "code_output":
        return "Code Output";
      case "code_challenge":
        return "Coding Challenge";
      default:
        return "Question";
    }
  };

  const getQuestionTypeColor = () => {
    switch (question.question_type) {
      case "mcq":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "code_output":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "code_challenge":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Q{questionNumber}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", getQuestionTypeColor())}>
              {getQuestionTypeLabel()}
            </Badge>
          </div>
          <Badge variant="outline">{question.points} pts</Badge>
        </div>
        <CardTitle className="text-lg mt-2">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{question.question_text}</ReactMarkdown>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* MCQ and Code Output use radio options */}
        {(question.question_type === "mcq" || question.question_type === "code_output") && 
          question.options && (
          <RadioGroup
            value={answer || ""}
            onValueChange={onAnswer}
          >
            {question.options.map((option, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
                  answer === option
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50",
                  showResult && option === question.correct_answer && "border-green-500 bg-green-500/10",
                  showResult && answer === option && answer !== question.correct_answer && "border-red-500 bg-red-500/10"
                )}
                onClick={() => onAnswer(option)}
              >
                <RadioGroupItem value={option} id={`option-${questionNumber}-${idx}`} />
                <Label 
                  htmlFor={`option-${questionNumber}-${idx}`} 
                  className="flex-1 cursor-pointer font-mono text-sm"
                >
                  {option}
                </Label>
                {answer === option && !showResult && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            ))}
          </RadioGroup>
        )}

        {/* Code Challenge uses code editor */}
        {question.question_type === "code_challenge" && (
          <div className="space-y-4">
            <CodeEditor
              initialCode={codeAnswer || question.code_template || ""}
              testCases={question.test_cases}
              expectedOutput={question.expected_output}
              language="javascript"
              onCodeChange={onCodeAnswer}
              onValidate={handleCodeValidation}
            />
            {codeValidated && (
              <div className={cn(
                "text-sm font-medium",
                codeCorrect ? "text-green-600" : "text-red-600"
              )}>
                {codeCorrect ? "✓ Code validated successfully!" : "✗ Code needs adjustment"}
              </div>
            )}
          </div>
        )}

        {/* Show explanation after submission */}
        {showResult && question.explanation && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">Explanation:</p>
            <p className="text-sm text-muted-foreground">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdaptiveQuestionCard;
