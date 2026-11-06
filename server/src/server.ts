import { app } from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { Task } from './models/Task';
import { Plant } from './models/Plant';
import { User } from './models/User';
import { RefreshToken } from './models/RefreshToken';

async function main() {
  await connectDB();
  await Promise.all([User.init(), Plant.init(), Task.init(), RefreshToken.init()]);

  const server = app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});