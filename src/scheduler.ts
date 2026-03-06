import cron from "node-cron";
import type { Client } from "discord.js";
import type { NotificationRepository } from "./notification-repository.js";
import { sendScheduleNotification } from "./notification-service.js";

let task: cron.ScheduledTask | null = null;

export function startScheduler(
  client: Client,
  repo: NotificationRepository
): void {
  task = cron.schedule("0 * * * *", async () => {
    const currentHour = new Date().getHours();
    console.log(`定期通知チェック: ${currentHour}時`);

    const entries = await repo.findByHour(currentHour);
    if (entries.length === 0) return;

    console.log(`${entries.length}件の通知を送信します`);

    for (const entry of entries) {
      await sendScheduleNotification(client, entry.channelId);
    }
  });

  console.log("スケジューラーを開始しました（毎時0分）");
}

export function stopScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log("スケジューラーを停止しました");
  }
}
