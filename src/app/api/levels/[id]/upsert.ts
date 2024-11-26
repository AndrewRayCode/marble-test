import { upsertLevel } from '@/repository/level';

export async function POST(req: Request) {
  const { level } = await req.json();
  await upsertLevel(level);
  return new Response(null, { status: 200 });
}
