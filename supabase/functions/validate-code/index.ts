import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateRequest {
  code: string;
  testCases: Array<{ input: string; expected: string }>;
  expectedOutput?: string;
  language: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, testCases, expectedOutput, language }: ValidateRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a code validator. Analyze the provided ${language} code and determine if it's correct.

Your task:
1. Check if the code syntax is valid
2. Mentally execute the code to determine its output
3. Compare against expected outputs or test cases
4. Return a structured validation result

Be strict but fair. Minor formatting differences (trailing newlines, extra spaces) should not cause failures.
Focus on logical correctness.`;

    const testInfo = testCases?.length 
      ? `Test cases:\n${testCases.map((tc, i) => `Case ${i + 1}: Input: ${tc.input}, Expected: ${tc.expected}`).join('\n')}`
      : `Expected output: ${expectedOutput}`;

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
            content: `Validate this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n${testInfo}` 
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_code",
              description: "Return the validation result for the submitted code",
              parameters: {
                type: "object",
                properties: {
                  isCorrect: { 
                    type: "boolean",
                    description: "Whether the code produces correct output for all test cases"
                  },
                  actualOutput: { 
                    type: "string",
                    description: "What the code would actually output"
                  },
                  feedback: { 
                    type: "string",
                    description: "Constructive feedback about the code"
                  },
                  syntaxErrors: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of syntax errors if any"
                  },
                  passedTests: {
                    type: "number",
                    description: "Number of test cases passed"
                  },
                  totalTests: {
                    type: "number",
                    description: "Total number of test cases"
                  }
                },
                required: ["isCorrect", "feedback"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "validate_code" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No validation response received");
    }

    const validationResult = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ success: true, ...validationResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error validating code:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
