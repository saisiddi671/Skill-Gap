import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  skillName: string;
  skillCategory: string;
  proficiencyLevel: string;
  questionCount?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skillName, skillCategory, proficiencyLevel, questionCount = 5 }: GenerateRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const difficultyDescription = {
      beginner: "basic concepts, simple syntax, fundamental understanding",
      intermediate: "practical applications, common patterns, debugging scenarios",
      advanced: "complex architectures, optimization, edge cases, best practices"
    };

    const targetDifficulty = difficultyDescription[proficiencyLevel as keyof typeof difficultyDescription] || difficultyDescription.intermediate;

    const systemPrompt = `You are an expert technical assessor creating programming skill assessments. Generate questions that accurately test ${skillName} knowledge at the ${proficiencyLevel} level.

Focus on: ${targetDifficulty}

Generate exactly ${questionCount} questions with a mix of:
1. Multiple choice questions (mcq) - 40% of questions
2. Code output prediction (code_output) - 40% of questions  
3. Code completion challenges (code_challenge) - 20% of questions

For each question, provide:
- question_type: "mcq", "code_output", or "code_challenge"
- question_text: Clear question with any code snippets in markdown code blocks
- options: Array of 4 possible answers (for mcq and code_output)
- correct_answer: The correct option text
- code_template: For code_challenge, provide starter code
- expected_output: For code_challenge, the expected console output or return value
- test_cases: For code_challenge, array of test inputs and expected outputs
- points: 1-3 based on difficulty
- explanation: Brief explanation of why the answer is correct

Make code examples realistic and practical. Test actual understanding, not memorization.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Generate ${questionCount} ${proficiencyLevel}-level assessment questions for ${skillName} (${skillCategory}). Return as a JSON array of questions.` 
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate assessment questions for a skill",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_type: { 
                          type: "string", 
                          enum: ["mcq", "code_output", "code_challenge"] 
                        },
                        question_text: { type: "string" },
                        options: { 
                          type: "array", 
                          items: { type: "string" } 
                        },
                        correct_answer: { type: "string" },
                        code_template: { type: "string" },
                        expected_output: { type: "string" },
                        test_cases: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              input: { type: "string" },
                              expected: { type: "string" }
                            }
                          }
                        },
                        points: { type: "number" },
                        explanation: { type: "string" }
                      },
                      required: ["question_type", "question_text", "correct_answer", "points"]
                    }
                  }
                },
                required: ["questions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract questions from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call response received");
    }

    const questionsData = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        questions: questionsData.questions,
        skill: skillName,
        level: proficiencyLevel
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating assessment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
