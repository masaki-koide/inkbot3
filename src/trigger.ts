import { loadConfig } from "./config.js";
import { initDatabase, disconnectDatabase } from "./database.js";
import { createNotificationRepository } from "./notification-repository.js";
import { createBot, startBot } from "./bot.js";
import { sendScheduleNotification } from "./notification-service.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const prisma = initDatabase(config.databaseUrl);
  const repo = createNotificationRepository(prisma);
  const client = createBot();

  await startBot(client, config.discordToken);

  const arg = process.argv.filter((a) => !a.startsWith("-")).at(2);
  const hour = arg !== undefined ? parseInt(arg, 10) : new Date().getHours();
  const entries = await repo.findByHour(hour);
  console.log(`${hour}時の通知先: ${entries.length}件`);

  for (const entry of entries) {
    await sendScheduleNotification(client, entry.channelId);
    console.log(`送信完了: ${entry.channelId}`);
  }

  client.destroy();
  await disconnectDatabase();
}

main().catch((error) => {
  console.error("手動トリガーエラー:", error);
  process.exit(1);
});
