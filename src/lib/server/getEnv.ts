import { env as dynamicPrivateEnv } from '$env/dynamic/private';

type MaybePlatform = { env?: Record<string, string> } | undefined | null;

export type AppEnv = {
  ACCOUNT_ID: string;
  SERVER_URL: string;
  TOKEN?: string;
  S3_PUBLIC_ACCESS_ENDPOINT?: string;
};

export default function getEnv(platform?: MaybePlatform): AppEnv {
  const cf = platform?.env ?? {};
  return {
    ACCOUNT_ID: cf.ACCOUNT_ID ?? dynamicPrivateEnv.ACCOUNT_ID ?? '',
    SERVER_URL: cf.SERVER_URL ?? dynamicPrivateEnv.SERVER_URL ?? '',
    TOKEN: cf.TOKEN ?? dynamicPrivateEnv.TOKEN,
    S3_PUBLIC_ACCESS_ENDPOINT:
      cf.S3_PUBLIC_ACCESS_ENDPOINT ?? dynamicPrivateEnv.S3_PUBLIC_ACCESS_ENDPOINT
  };
}
