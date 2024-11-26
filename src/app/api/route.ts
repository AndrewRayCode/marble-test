import { getLevels } from '@/repository/level';

export async function GET() {
  const levels = await getLevels();
  return Response.json({ levels });
}
