import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to extract project context from the prompt
function extractProjectContext(prompt: string): {
  projectType: string;
  industry: string;
  audience: string;
  isNonTechnical: boolean;
} {
  const lowerPrompt = prompt.toLowerCase();
  
  // Detect project type
  let projectType = 'general';
  let industry = 'general';
  let audience = 'general users';
  let isNonTechnical = true;
  
  // Technical project indicators
  const techIndicators = ['app', 'application', 'software', 'website', 'platform', 'api', 'system', 'database', 'backend', 'frontend'];
  const hasTechIndicators = techIndicators.some(indicator => lowerPrompt.includes(indicator));
  
  // Non-technical project indicators
  const nonTechIndicators = ['newsletter', 'course', 'workshop', 'book', 'blog', 'podcast', 'art', 'music', 'event', 'community', 'service'];
  const hasNonTechIndicators = nonTechIndicators.some(indicator => lowerPrompt.includes(indicator));
  
  // Industry detection
  if (lowerPrompt.includes('marketplace') || lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shop')) {
    projectType = 'marketplace';
    industry = 'commerce';
  } else if (lowerPrompt.includes('education') || lowerPrompt.includes('course') || lowerPrompt.includes('learning')) {
    projectType = 'educational';
    industry = 'education';
  } else if (lowerPrompt.includes('social') || lowerPrompt.includes('community') || lowerPrompt.includes('network')) {
    projectType = 'social';
    industry = 'social';
  } else if (lowerPrompt.includes('dog') || lowerPrompt.includes('pet') || lowerPrompt.includes('animal')) {
    industry = 'pet care';
  } else if (lowerPrompt.includes('art') || lowerPrompt.includes('creative') || lowerPrompt.includes('design')) {
    projectType = 'creative';
    industry = 'creative';
  } else if (lowerPrompt.includes('newsletter') || lowerPrompt.includes('blog') || lowerPrompt.includes('content')) {
    projectType = 'content';
    industry = 'media';
  }
  
  // Audience detection
  if (lowerPrompt.includes('student') || lowerPrompt.includes('learner')) {
    audience = 'students';
  } else if (lowerPrompt.includes('business') || lowerPrompt.includes('company') || lowerPrompt.includes('enterprise')) {
    audience = 'businesses';
  } else if (lowerPrompt.includes('creator') || lowerPrompt.includes('artist')) {
    audience = 'creators';
  } else if (lowerPrompt.includes('owner') || lowerPrompt.includes('customer')) {
    audience = 'consumers';
  }
  
  // Determine if technical
  isNonTechnical = !hasTechIndicators || hasNonTechIndicators;
  
  return { projectType, industry, audience, isNonTechnical };
}

// Export a function to generate roadmap based on user prompt
export async function generateRoadmap(prompt: string) {
  const MAX_ATTEMPTS = 3;
  let lastError: any;

  // Simple language detection based on common Spanish words
  const spanishIndicators = /\b(el|la|los|las|de|del|en|con|para|por|que|es|son|un|una|y|o|pero|como|más|muy|todo|todos|esta|este|esto|esa|ese|eso)\b/i;
  const isSpanish = spanishIndicators.test(prompt);
  const language = isSpanish ? 'Spanish' : 'English';
  
  // Extract context from the prompt
  const context = extractProjectContext(prompt);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`\n▶️  OpenAI roadmap generation – attempt ${attempt}/${MAX_ATTEMPTS}`);
      console.log('Creating OpenAI chat completion with prompt:', prompt);
      console.log('Detected language:', language);
      console.log('Detected context:', context);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are Briki, an AI assistant that helps users create project roadmaps. Your goal is to provide clear, actionable guidance tailored to their specific needs.

IMPORTANT: Generate ALL content in ${language}.

Project Context:
- Type: ${context.projectType}
- Industry: ${context.industry}
- Target Audience: ${context.audience}
- Technical Level: ${context.isNonTechnical ? 'Non-technical/Beginner-friendly' : 'Technical'}

Guidelines for creating roadmaps:
1. Use phase names that are relevant to the specific project type and industry
2. Avoid technical jargon for non-technical projects
3. Focus on practical, actionable steps
4. Recommend tools only when they're truly relevant to the project
5. Adapt the complexity based on the project scope
6. For creative projects, focus on creative process steps
7. For content projects, focus on content strategy and production
8. For marketplaces, focus on user acquisition, trust, and transactions
9. Keep descriptions clear and motivating

Your response must be a JSON object with this structure:
{
  "phases": [
    {
      "id": "phase-1",
      "title": "Contextually relevant phase name in ${language}",
      "description": "Clear description adapted to the project type in ${language}",
      "priority": "high|medium|low",
      "category": "Choose the most appropriate: planning|design|development|content|marketing|operations|growth",
      "estimatedTime": number (in hours),
      "dependencies": [],
      "tasks": [
        {
          "id": "task-1-1",
          "title": "Specific, actionable task in ${language}",
          "description": "Detailed explanation in ${language}",
          "status": "pending",
          "priority": "high|medium|low",
          "estimatedTime": number,
          "tools": ["only include if truly relevant"],
          "metadata": {
            "complexity": "low|medium|high",
            "requiredSkills": ["relevant skills for this specific task"]
          }
        }
      ],
      "tools": ["only include if truly relevant"],
      "status": "pending",
      "metadata": {
        "complexity": "low|medium|high",
        "order": number
      }
    }
  ],
  "title": "Project name in ${language}",
  "description": "Project description in ${language}"
}

Remember: 
- Adapt phase names to the project (e.g., "Content Planning" for newsletters, not "System Architecture")
- Keep it practical and achievable
- Don't overwhelm with unnecessary technical details
- Focus on what will actually help the user succeed`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7, // Increased for more creativity
        max_tokens: 4096,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('OpenAI returned empty response');
      }

      console.log('Raw OpenAI response:', content);

      // Quick JSON parse to detect truncation or invalid JSON early
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (jsonErr) {
        throw new Error(`JSON.parse failed: ${(jsonErr as Error).message}`);
      }

      // Enable or disable validation via environment variable
      const shouldValidate = process.env.VALIDATE_OPENAI_RESPONSE !== 'false';
      if (!shouldValidate) {
        console.warn('Skipping OpenAI response validation (VALIDATE_OPENAI_RESPONSE=false)');
        return content;
      }

      // Basic validation (less rigid than before)
      if (!parsed.phases || !Array.isArray(parsed.phases)) {
        throw new Error('Response missing phases array');
      }
      
      // Validate each phase has basic required fields
      parsed.phases.forEach((phase: any, index: number) => {
        if (!phase.id || !phase.title || !phase.description) {
          throw new Error(`Phase ${index + 1} missing required fields`);
        }
        
        // Ensure tasks array exists
        if (!Array.isArray(phase.tasks)) {
          phase.tasks = [];
        }
        
        // Basic task validation
        phase.tasks.forEach((task: any, taskIndex: number) => {
          if (!task.id || !task.title) {
            throw new Error(`Task ${taskIndex + 1} in phase ${index + 1} missing required fields`);
          }
          
          // Ensure tools array exists
          if (!Array.isArray(task.tools)) {
            task.tools = [];
          }
        });
        
        // Ensure phase tools array exists
        if (!Array.isArray(phase.tools)) {
          phase.tools = [];
        }
      });

      console.log('OpenAI response validated successfully');
      return content; // ✅ success, exit early

    } catch (error) {
      // Save error and retry
      lastError = error;
      console.warn(`Attempt ${attempt} failed – ${error instanceof Error ? error.message : error}`);
      // Small delay to avoid hitting rate limits aggressively
      await new Promise((res) => setTimeout(res, 500 * attempt));
    }
  }

  // All attempts failed – log and throw the last captured error
  console.error('All attempts to generate a valid roadmap failed');
  if (lastError) throw lastError;
  throw new Error('Unknown error generating roadmap');
}

export default openai; 