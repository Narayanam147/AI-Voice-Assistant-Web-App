import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const start = async () => {
  app.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT}`);
  });
};

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
