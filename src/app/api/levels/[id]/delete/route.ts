import { deleteLevel } from '@/repository/level';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await deleteLevel((await params).id);
  return new Response(null, { status: 200 });
}
