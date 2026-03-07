import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createCommandLogRepository } from "./command-log-repository.js";

function createMockPrisma() {
  return {
    commandLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaClient;
}

describe("createCommandLogRepository", () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("全フィールドが正しく保存される", async () => {
    const repo = createCommandLogRepository(prisma);

    await repo.log({
      commandName: "subscribe",
      guildId: "guild-1",
      guildName: "Test Guild",
      channelId: "ch-123",
      channelName: "general",
      userId: "user-1",
      userName: "testuser",
      userDisplayName: "Test User",
      options: "hour=7",
    });

    expect(prisma.commandLog.create).toHaveBeenCalledWith({
      data: {
        commandName: "subscribe",
        guildId: "guild-1",
        guildName: "Test Guild",
        channelId: "ch-123",
        channelName: "general",
        userId: "user-1",
        userName: "testuser",
        userDisplayName: "Test User",
        options: "hour=7",
      },
    });
  });

  it("options が null の場合に正常に動作する", async () => {
    const repo = createCommandLogRepository(prisma);

    await repo.log({
      commandName: "unsubscribe",
      guildId: "guild-1",
      guildName: "Test Guild",
      channelId: "ch-123",
      channelName: "general",
      userId: "user-1",
      userName: "testuser",
      userDisplayName: "Test User",
      options: null,
    });

    expect(prisma.commandLog.create).toHaveBeenCalledWith({
      data: {
        commandName: "unsubscribe",
        guildId: "guild-1",
        guildName: "Test Guild",
        channelId: "ch-123",
        channelName: "general",
        userId: "user-1",
        userName: "testuser",
        userDisplayName: "Test User",
        options: null,
      },
    });
  });
});
