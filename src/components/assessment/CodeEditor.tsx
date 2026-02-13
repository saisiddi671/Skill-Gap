import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestCase {
  input: string;
  expected: string;
}

interface ValidationResult {
  isCorrect: boolean;
  actualOutput?: string;
  feedback: string;
  passedTests?: number;
  totalTests?: number;
  syntaxErrors?: string[];
}

interface CodeEditorProps {
  initialCode?: string;
  testCases?: TestCase[];
  expectedOutput?: string;
  language?: string;
  onValidate?: (result: ValidationResult) => void;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
}

const CodeEditor = ({
  initialCode = "",
  testCases = [],
  expectedOutput,
  language = "javascript",
  onValidate,
  onCodeChange,
  readOnly = false,
}: CodeEditorProps) => {
  const [code, setCode] = useState(initialCode);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    setResult(null);
    onCodeChange?.(value);
  }, [onCodeChange]);

  const validateCode = async () => {
    if (!code.trim()) return;
    
    setValidating(true);
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            code,
            testCases,
            expectedOutput,
            language,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Validation failed");
      }

      const validationResult = await response.json();
      setResult(validationResult);
      onValidate?.(validationResult);
    } catch (error) {
      console.error("Validation error:", error);
      setResult({
        isCorrect: false,
        feedback: error instanceof Error ? error.message : "Failed to validate code",
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="outline" className="text-xs">
            {language}
          </Badge>
        </div>
        <Textarea
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder={`Write your ${language} code here...`}
          className={cn(
            "font-mono text-sm min-h-[200px] resize-y bg-muted/30",
            "focus:ring-2 focus:ring-primary/20",
            readOnly && "opacity-70 cursor-not-allowed"
          )}
          readOnly={readOnly}
          spellCheck={false}
        />
      </div>

      {!readOnly && (
        <div className="flex items-center gap-4">
          <Button
            onClick={validateCode}
            disabled={validating || !code.trim()}
            className="gap-2"
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {validating ? "Validating..." : "Run & Validate"}
          </Button>

          {testCases.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {testCases.length} test case{testCases.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {result && (
        <Card className={cn(
          "border-2",
          result.isCorrect ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {result.isCorrect ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-green-600">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-600">Not quite right</span>
                </>
              )}
              {result.passedTests !== undefined && (
                <Badge variant="secondary" className="ml-auto">
                  {result.passedTests}/{result.totalTests} tests passed
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{result.feedback}</p>
            
            {result.actualOutput && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Your output:</p>
                <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                  {result.actualOutput}
                </pre>
              </div>
            )}

            {result.syntaxErrors && result.syntaxErrors.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-red-600 mb-1">Syntax errors:</p>
                <ul className="text-xs text-red-500 list-disc list-inside">
                  {result.syntaxErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CodeEditor;
