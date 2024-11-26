import { upsertLevel } from '@/repository/level';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { level } = await req.json();
  await upsertLevel({ ...level, id: (await params).id });
  return new Response(null, { status: 200 });
}
