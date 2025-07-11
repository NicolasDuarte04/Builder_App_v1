import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export const runtime = 'edge';

const oai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemPrompt = `You are Briki, an AI project coach and assistant. 
- Your primary goal is to be a helpful, conversational partner.
- Engage with the user, answer their questions about tools, technologies, or project management. Be curious and proactive.
- If the user expresses a desire to build or create a project, your secondary goal is to guide them toward generating a roadmap.
- To do this, you MUST collect two pieces of information: a project name and a project description/idea.
- Ask for them one at a time or together, but do not call the 'create_roadmap' tool until you have both.
- Once you have both the name and description, confirm with the user before calling the tool. For example: "Great! I have the project name as 'My Awesome App' and the idea is 'a platform for connecting dog walkers'. Shall I create the roadmap for you?"
- Only when the user confirms should you call the 'create_roadmap' tool.
- Do not make up a project name or description.
- Respond in the user's language.
- Be friendly and encouraging.`;

  const result = await streamText({
    model: oai('gpt-4-turbo-preview'),
    system: systemPrompt,
    messages,
    tools: {
      create_roadmap: {
        description: 'Creates a project roadmap when the user has provided a name and an idea.',
        parameters: z.object({
          projectName: z.string().describe('The name of the project.'),
          projectDescription: z.string().describe('A detailed description of the project idea.'),
        }),
        execute: async ({ projectName }) => {
            // In a real scenario, you'd trigger the roadmap generation here.
            // For now, we just confirm it's been called by returning a confirmation message.
           return {
               success: true,
               message: `(Roadmap generation for '${projectName}' initiated). You can now view your roadmap.`
           }
        }
      },
    },
  });

  return result.toDataStreamResponse();
} 