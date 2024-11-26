import { upsertLevel } from '@/repository/level';

export async function POST(req: Request) {
  const { level } = await req.json();
  const saved = await upsertLevel(level);
  return Response.json({ level: saved });
}
