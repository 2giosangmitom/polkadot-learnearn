interface Milestone {
  id: string;
  title: string;
  description: string;
  expectedAnswer?: string;
  requiredScore: number;
  lessonId: string;
}

interface GradeResult {
  score: number;
  passed: boolean;
  feedback: string;
  details?: string[];
}

/**
 * Grade a student's answer against a milestone
 * This uses AI to evaluate the quality and correctness of the answer
 */
export async function gradeAnswer(
  milestone: Milestone,
  answer: string
): Promise<GradeResult> {
  // Validate input
  if (!answer || answer.trim().length === 0) {
    return {
      score: 0,
      passed: false,
      feedback: "No answer provided. Please submit your answer to be graded.",
      details: ["Answer is empty"]
    };
  }

  // Check minimum length (basic validation)
  if (answer.trim().length < 20) {
    return {
      score: 20,
      passed: false,
      feedback: "Your answer is too short. Please provide a more detailed response.",
      details: ["Answer should be at least 20 characters long"]
    };
  }

  try {
    // Call AI service for grading
    const aiResponse = await gradeWithAI(milestone, answer);
    
    return {
      score: aiResponse.score,
      passed: aiResponse.score >= milestone.requiredScore,
      feedback: aiResponse.feedback,
      details: aiResponse.details
    };
  } catch (error) {
    console.error("Error grading answer:", error);
    
    // Fallback to basic grading if AI fails
    return fallbackGrading(milestone, answer);
  }
}

/**
 * Use AI service to grade the answer
 */
async function gradeWithAI(
  milestone: Milestone,
  answer: string
): Promise<GradeResult> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn("No AI API key found, using fallback grading");
    return fallbackGrading(milestone, answer);
  }

  const prompt = buildGradingPrompt(milestone, answer);
  
  // Use OpenAI API (you can switch to Anthropic or other providers)
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert educational assessor specializing in Polkadot and blockchain technology. Grade student answers objectively and provide constructive feedback."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const aiResult = data.choices[0].message.content;
  
  // Parse AI response
  return parseAIResponse(aiResult, milestone);
}

/**
 * Build the grading prompt for the AI
 */
function buildGradingPrompt(milestone: Milestone, answer: string): string {
  return `
Please grade the following student answer for this learning milestone:

**Milestone Title:** ${milestone.title}
**Milestone Description:** ${milestone.description}
${milestone.expectedAnswer ? `**Expected Answer Points:** ${milestone.expectedAnswer}` : ''}

**Student's Answer:**
${answer}

**Grading Instructions:**
1. Evaluate the answer on a scale of 0-100
2. Consider accuracy, completeness, and understanding
3. The required passing score is ${milestone.requiredScore}
4. Provide specific, constructive feedback

Please respond in this exact JSON format:
{
  "score": <number 0-100>,
  "feedback": "<constructive feedback for the student>",
  "details": ["<specific point 1>", "<specific point 2>", ...]
}
`.trim();
}

/**
 * Parse the AI response into a structured result
 */
function parseAIResponse(aiResult: string, milestone: Milestone): GradeResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      score: Math.min(100, Math.max(0, parsed.score || 0)),
      passed: parsed.score >= milestone.requiredScore,
      feedback: parsed.feedback || "No feedback provided",
      details: parsed.details || []
    };
  } catch (error) {
    console.error("Error parsing AI response:", error);
    
    // Try to extract score and feedback from text
    const scoreMatch = aiResult.match(/score[:\s]+(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
    
    return {
      score,
      passed: score >= milestone.requiredScore,
      feedback: aiResult.substring(0, 500),
      details: []
    };
  }
}

/**
 * Fallback grading when AI is not available
 */
function fallbackGrading(milestone: Milestone, answer: string): GradeResult {
  const answerLength = answer.trim().length;
  const wordCount = answer.trim().split(/\s+/).length;
  
  // Simple heuristic-based grading
  let score = 40; // Base score for attempting
  
  // Length bonus (up to 20 points)
  if (answerLength > 100) score += 10;
  if (answerLength > 300) score += 10;
  
  // Word count bonus (up to 20 points)
  if (wordCount > 20) score += 10;
  if (wordCount > 50) score += 10;
  
  // Keyword matching (up to 20 points)
  if (milestone.expectedAnswer) {
    const expectedKeywords = extractKeywords(milestone.expectedAnswer);
    const answerLower = answer.toLowerCase();
    const matchedKeywords = expectedKeywords.filter(kw => 
      answerLower.includes(kw.toLowerCase())
    );
    score += Math.min(20, matchedKeywords.length * 5);
  }
  
  score = Math.min(100, score);
  
  return {
    score,
    passed: score >= milestone.requiredScore,
    feedback: score >= milestone.requiredScore
      ? "Good effort! Your answer demonstrates understanding of the topic."
      : "Your answer needs more detail. Try to elaborate more on the key concepts.",
    details: [
      `Answer length: ${answerLength} characters`,
      `Word count: ${wordCount} words`,
      score >= milestone.requiredScore ? "Passed basic checks" : "Needs improvement"
    ]
  };
}

/**
 * Extract keywords from expected answer
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3) // Only words longer than 3 chars
    .filter(word => !["this", "that", "with", "from", "have"].includes(word));
}
