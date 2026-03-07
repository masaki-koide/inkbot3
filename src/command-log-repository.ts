import type { PrismaClient } from "../generated/prisma/client.js";

export interface CommandLogInput {
  commandName: string;
  guildId: string;
  guildName: string;
  channelId: string;
  channelName: string;
  userId: string;
  userName: string;
  options: string | null;
}

export function createCommandLogRepository(prisma: PrismaClient) {
  return {
    async log(input: CommandLogInput): Promise<void> {
      await prisma.commandLog.create({
        data: {
          commandName: input.commandName,
          guildId: input.guildId,
          guildName: input.guildName,
          channelId: input.channelId,
          channelName: input.channelName,
          userId: input.userId,
          userName: input.userName,
          options: input.options,
        },
      });
    },
  };
}

export type CommandLogRepository = ReturnType<typeof createCommandLogRepository>;
