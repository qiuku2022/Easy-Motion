import { Config } from '@remotion/cli/config';

export const config: Config = {
  ffmpegExecutable: null,
  ffprobeExecutable: null,
  logLevel: 'verbose',
  overrideWebpackConfig: (currentConfiguration) => {
    return currentConfiguration;
  },
  setStillFrame: 0,
  puppeteerTimeout: 30000,
  concurrency: 1,
  maxRetries: 1,
  muted: false,
  setImageFormat: 'jpeg',
  setQuality: undefined,
  delayRenderTimeoutInMilliseconds: 30000,
  headless: true,
  versioningApi: null,
  publicDir: null,
};
