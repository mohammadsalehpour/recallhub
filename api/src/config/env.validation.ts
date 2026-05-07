type Env = Record<string, string | undefined>;

const requiredKeys = [
  'DATABASE_URL',
  'APP_JWT_SECRET',
  'APP_API_KEY',
  'N8N_TRIGGER_SECRET',
  'N8N_CALLBACK_SECRET',
  'N8N_CALLBACK_URL',
  'N8N_INTERNAL_BASE_URL',
  'ALLOWED_REPO_ROOTS',
] as const;

export function validateEnv(config: Env) {
  const missing = requiredKeys.filter((key) => !config[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return config;
}
