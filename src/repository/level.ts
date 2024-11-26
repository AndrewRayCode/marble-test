import db from '@/prisma/connection';
import { Level } from '@prisma/client';
import { InputJsonObject } from '@prisma/client/runtime/library';

export const getLevels = async () => {
  return await db.level.findMany();
};

export const upsertLevel = async (level: Level) => {
  const toSave = {
    ...level,
    data: level.data as InputJsonObject,
  };
  return await db.level.upsert({
    where: { id: level.id || 'new-level-this-is-not-how-upsert-works-prisma' },
    update: toSave,
    create: toSave,
  });
};
