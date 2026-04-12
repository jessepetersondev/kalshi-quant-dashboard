import { createRuntimeConfig } from "./runtime-config.js";

export interface ServerSecrets {
  readonly databaseUrl: string;
  readonly rabbitMqUrl: string;
  readonly sessionCookieSecret: string;
}

export interface SecretBoundary {
  readonly browserSafe: false;
  readonly secrets: ServerSecrets;
}

export function getServerSecrets(
  source: NodeJS.ProcessEnv = process.env
): SecretBoundary {
  const config = createRuntimeConfig(source);

  return {
    browserSafe: false,
    secrets: {
      databaseUrl: config.env.DATABASE_URL,
      rabbitMqUrl: config.env.RABBITMQ_URL,
      sessionCookieSecret: config.env.SESSION_COOKIE_SECRET
    }
  };
}
