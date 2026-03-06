import type { PrismaClient, NotificationEntry } from "../generated/prisma/client.js";

export function createNotificationRepository(prisma: PrismaClient) {
  return {
    async upsert(guildId: string, channelId: string, hour: number): Promise<NotificationEntry> {
      return prisma.notificationEntry.upsert({
        where: { guildId_channelId: { guildId, channelId } },
        update: { hour },
        create: { guildId, channelId, hour },
      });
    },

    async remove(guildId: string, channelId: string): Promise<boolean> {
      try {
        await prisma.notificationEntry.delete({
          where: { guildId_channelId: { guildId, channelId } },
        });
        return true;
      } catch {
        return false;
      }
    },

    async findByHour(hour: number): Promise<ReadonlyArray<NotificationEntry>> {
      return prisma.notificationEntry.findMany({ where: { hour } });
    },

    async findByGuildAndChannel(guildId: string, channelId: string): Promise<NotificationEntry | null> {
      return prisma.notificationEntry.findUnique({
        where: { guildId_channelId: { guildId, channelId } },
      });
    },
  };
}

export type NotificationRepository = ReturnType<typeof createNotificationRepository>;
