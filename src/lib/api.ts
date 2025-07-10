export async function generateRoadmap(prompt: string, projectType?: string) {
  const response = await fetch('/api/ai/roadmap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, projectType }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate roadmap');
  }

  return response.json();
} 