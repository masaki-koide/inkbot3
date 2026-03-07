import { loadConfig } from "./config.js";
import { initDatabase, disconnectDatabase } from "./database.js";
import { createNotificationRepository } from "./notification-repository.js";
import { createCommandLogRepository } from "./command-log-repository.js";
import { createBot, registerCommands, startBot } from "./bot.js";
import { setupCommandHandler } from "./command-handler.js";
import { startScheduler, stopScheduler } from "./scheduler.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const prisma = initDatabase(config.databaseUrl);
  const repo = createNotificationRepository(prisma);
  const commandLogRepo = createCommandLogRepository(prisma);

  const client = createBot();

  setupCommandHandler(client, repo, commandLogRepo);

  await startBot(client, config.discordToken);
  await registerCommands(config.discordToken, config.discordApplicationId);

  startScheduler(client, repo);

  console.log("全コンポーネントが正常に起動しました");

  const shutdown = async () => {
    console.log("シャットダウン中...");
    stopScheduler();
    client.destroy();
    await disconnectDatabase();
    console.log("シャットダウン完了");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("起動エラー:", error);
  process.exit(1);
});
