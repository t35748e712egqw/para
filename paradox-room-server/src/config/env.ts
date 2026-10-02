export type NodeEnv = 'development' | 'production' | 'test';

export interface EnvConfig {
  port: number;
  nodeEnv: NodeEnv;
  host: string;
}

function parsePort(value: string | undefined, defaultPort: number): number {
  if (!value) {
    return defaultPort;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    return defaultPort;
  }
  return parsed;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (value === 'production' || value === 'test') {
    return value;
  }
  return 'development';
}

export const env: EnvConfig = {
  port: parsePort(process.env.PORT, 3000),
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  host: '0.0.0.0',
};
