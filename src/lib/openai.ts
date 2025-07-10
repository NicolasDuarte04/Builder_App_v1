import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Export a function to generate roadmap based on user prompt
export async function generateRoadmap(prompt: string) {
  const MAX_ATTEMPTS = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`\n▶️  OpenAI roadmap generation – attempt ${attempt}/${MAX_ATTEMPTS}`);
      console.log('Creating OpenAI chat completion with prompt:', prompt);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a project roadmap generator. Your task is to create structured roadmap phases for software development projects.
          
Your response should be a JSON object with the following structure:
{
  "phases": [
    {
      "id": "phase-1",
      "title": "Project Setup",
      "description": "Initialize repository and install core dependencies",
      "priority": "high",
      "category": "setup",
      "estimatedTime": 2,
      "dependencies": [],
      "tasks": [
        {
          "id": "task-1-1",
          "title": "Initialize Git Repository",
          "description": "Create and configure Git repository with proper .gitignore",
          "status": "pending",
          "priority": "high",
          "estimatedTime": 0.5,
          "tools": ["github", "git"],
          "metadata": {
            "complexity": "low",
            "requiredSkills": ["git", "command-line"]
          }
        }
      ],
      "tools": ["vscode", "github"],
      "status": "pending",
      "metadata": {
        "complexity": "low",
        "order": 0
      }
    }
  ],
  "title": "Project Name",
  "description": "Brief project description"
}

Requirements:
- id: String in format "phase-{number}" for phases, "task-{phaseNumber}-{taskNumber}" for tasks
- title: Concise name for the phase/task (string)
- description: Detailed explanation (string)
- priority: Must be exactly "high", "medium", or "low" (string)
- category: Must be exactly "setup", "development", "testing", "deployment", or "maintenance" (string)
- estimatedTime: Estimated time in hours (number)
- dependencies: Array of phase IDs this phase depends on (string[])
- tasks: Array of task objects with all required fields
- tools: Array of tool IDs that are needed (string[])
- status: Must be "pending" for new phases/tasks
- metadata: Object with at least complexity and order/skills fields

Always return a valid JSON object with all required fields.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
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

      // Validate response format (only if enabled)
      if (!parsed.phases || !Array.isArray(parsed.phases)) {
        throw new Error('Response missing phases array');
      }
      
      // Validate each phase
      parsed.phases.forEach((phase: any, index: number) => {
        // Validate phase ID format
        if (!phase.id || !/^phase-\d+$/.test(phase.id)) {
          throw new Error(`Phase ${index + 1} has invalid id format (should be phase-{number})`);
        }
        
        // Validate required phase fields
        if (!phase.title || typeof phase.title !== 'string') {
          throw new Error(`Phase ${index + 1} missing or invalid title`);
        }
        if (!phase.description || typeof phase.description !== 'string') {
          throw new Error(`Phase ${index + 1} missing or invalid description`);
        }
        if (!Array.isArray(phase.dependencies)) {
          throw new Error(`Phase ${index + 1} missing or invalid dependencies array`);
        }
        if (typeof phase.estimatedTime !== 'number') {
          throw new Error(`Phase ${index + 1} missing or invalid estimatedTime`);
        }
        if (!['high', 'medium', 'low'].includes(phase.priority)) {
          throw new Error(`Phase ${index + 1} invalid priority value`);
        }
        if (!['setup', 'development', 'testing', 'deployment', 'maintenance'].includes(phase.category)) {
          throw new Error(`Phase ${index + 1} invalid category value`);
        }
        if (!Array.isArray(phase.tasks)) {
          throw new Error(`Phase ${index + 1} missing tasks array`);
        }
        if (!Array.isArray(phase.tools)) {
          throw new Error(`Phase ${index + 1} missing tools array`);
        }
        if (phase.status !== 'pending') {
          throw new Error(`Phase ${index + 1} status must be "pending"`);
        }
        if (!phase.metadata || typeof phase.metadata !== 'object') {
          throw new Error(`Phase ${index + 1} missing metadata object`);
        }

        // Validate each task in the phase
        phase.tasks.forEach((task: any, taskIndex: number) => {
          // Validate task ID format
          if (!task.id || !new RegExp(`^task-${index + 1}-\\d+$`).test(task.id)) {
            throw new Error(`Task ${taskIndex + 1} in phase ${index + 1} has invalid id format`);
          }

          // Validate required task fields
          if (!task.title || typeof task.title !== 'string') {
            throw new Error(`Task ${taskIndex + 1} in phase ${index + 1} missing or invalid title`);
          }
          if (!task.description || typeof task.description !== 'string') {
            throw new Error(`Task ${taskIndex + 1} in phase ${index + 1} missing or invalid description`);
          }
          if (typeof task.estimatedTime !== 'number') {
            throw new Error(`Task ${taskIndex + 1} in phase ${index + 1} missing or invalid estimatedTime`);
          }
          if (!['high', 'medium', 'low'].includes(task.priority)) {
            throw new Error(`Task ${taskIndex + 1} in phase ${index + 1} invalid priority value`);
          }
          if (!Array.isArray(task.tools)) {
            throw new Error(`Task ${taskIndex + 1} in phase ${index + 1} missing tools array`);
          }
          if (task.status !== 'pending') {
            throw new Error(`Task ${taskIndex + 1} in phase ${index + 1} status must be "pending"`);
          }
          if (!task.metadata || typeof task.metadata !== 'object') {
            throw new Error(`Task ${taskIndex + 1} in phase ${index + 1} missing metadata object`);
          }
        });
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