/*
  Invoke the AI chat route handler locally to validate tool params and no headers() warnings.
*/
import { POST as chatPOST } from '../../src/app/api/ai/chat/route';

async function runCase(text: string) {
  const req = new Request('http://local/api/ai/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: text }],
      preferredLanguage: 'es',
    }),
  });
  const res = await chatPOST(req as unknown as Request);
  console.log('chat status', res.status, 'for', JSON.stringify(text));
}

async function main() {
  await runCase('seguro educativo');
  await runCase('seguro de educación');
  await runCase('education insurance');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


