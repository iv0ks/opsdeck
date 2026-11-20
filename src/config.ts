// Runtime configuration, read once from the environment.
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  databaseUrl: required('DATABASE_URL', 'postgres://opsdeck:opsdeck@localhost:5432/opsdeck'),
  sessionSecret: required('SESSION_SECRET', 'dev-only-insecure-secret-change-me'),

  // The challenge flag, baked into the image at build time and seeded into the
  // victim's order. Never committed.
  flag: required('FLAG', 'FLAG{OPSDECK_HIDDEN_ADMIN}'),
};
