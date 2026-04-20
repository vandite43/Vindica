import { prisma } from './db';
import { DEFAULT_AI_MODEL } from './constants';

const AI_MODEL_KEY = 'ai_model';

/**
 * Returns the globally configured AI model.
 * Falls back to DEFAULT_AI_MODEL if not yet set in DB.
 */
export async function getGlobalAIModel(): Promise<string> {
  const row = await prisma.systemConfig.findUnique({ where: { key: AI_MODEL_KEY } });
  return row?.value ?? DEFAULT_AI_MODEL;
}

/**
 * Persists the global AI model. SUPER_ADMIN only — caller must enforce this.
 */
export async function setGlobalAIModel(modelId: string, updatedBy: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where:  { key: AI_MODEL_KEY },
    create: { key: AI_MODEL_KEY, value: modelId, updatedBy },
    update: { value: modelId, updatedBy },
  });
}
