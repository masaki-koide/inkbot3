import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbedBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import type { NotificationRepository } from "./notification-repository.js";
import type { CommandLogRepository } from "./command-log-repository.js";
import { handleSubscribe, handleUnsubscribe } from "./command-handler.js";

function createMockInteraction(
  overrides: {
    channelId?: string;
    guildId?: string | null;
    guildName?: string;
    channelName?: string;
    userId?: string;
    userName?: string;
    userDisplayName?: string;
    hourValue?: number | null;
    commandName?: string;
    optionsData?: Array<{ name: string; value: unknown }>;
  } = {}
) {
  const {
    channelId = "ch-123",
    guildId = "guild-1",
    guildName = "Test Guild",
    channelName = "general",
    userId = "user-1",
    userName = "testuser",
    userDisplayName = "Test User",
    hourValue = null,
    commandName = "subscribe",
    optionsData,
  } = overrides;
  const data = optionsData
    ?? (hourValue != null ? [{ name: "hour", value: hourValue }] : []);
  return {
    channelId,
    guildId,
    commandName,
    guild: guildId ? { name: guildName } : null,
    channel: { name: channelName },
    user: { id: userId, username: userName },
    member: guildId ? { displayName: userDisplayName } : null,
    options: {
      getInteger: vi.fn((name: string, _required?: boolean) => {
        if (name === "hour") return hourValue;
        return null;
      }),
      data,
    },
    reply: vi.fn(),
  } as unknown as ChatInputCommandInteraction;
}

function createMockRepo(
  overrides: Partial<NotificationRepository> = {}
): NotificationRepository {
  return {
    upsert: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(true),
    findByHour: vi.fn().mockResolvedValue([]),
    findByGuildAndChannel: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as NotificationRepository;
}

function createMockCommandLogRepo(
  overrides: Partial<CommandLogRepository> = {}
): CommandLogRepository {
  return {
    log: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as CommandLogRepository;
}

describe("handleSubscribe", () => {
  let repo: NotificationRepository;
  let commandLogRepo: CommandLogRepository;

  beforeEach(() => {
    repo = createMockRepo();
    commandLogRepo = createMockCommandLogRepo();
  });

  it("実行チャンネル ID を通知先として使用する", async () => {
    const interaction = createMockInteraction({ channelId: "ch-999" });
    await handleSubscribe(interaction, repo, commandLogRepo);

    expect(repo.upsert).toHaveBeenCalledWith("guild-1", "ch-999", expect.any(Number));
  });

  it("hour オプション省略時にデフォルト値 7 で登録する", async () => {
    const interaction = createMockInteraction({ hourValue: null });
    await handleSubscribe(interaction, repo, commandLogRepo);

    expect(repo.upsert).toHaveBeenCalledWith("guild-1", "ch-123", 7);
  });

  it("hour オプション指定時にその値で登録する", async () => {
    const interaction = createMockInteraction({ hourValue: 14 });
    await handleSubscribe(interaction, repo, commandLogRepo);

    expect(repo.upsert).toHaveBeenCalledWith("guild-1", "ch-123", 14);
  });

  it("応答メッセージにチャンネルと通知時刻を含める", async () => {
    const interaction = createMockInteraction({ channelId: "ch-500", hourValue: 9 });
    await handleSubscribe(interaction, repo, commandLogRepo);

    const replyCall = vi.mocked(interaction.reply).mock.calls[0][0] as {
      embeds: EmbedBuilder[];
    };
    const description = replyCall.embeds[0].data.description;
    expect(description).toContain("<#ch-500>");
    expect(description).toContain("9時");
  });

  it("サーバー外実行時にエラーメッセージを返す", async () => {
    const interaction = createMockInteraction({ guildId: null });
    await handleSubscribe(interaction, repo, commandLogRepo);

    const replyCall = vi.mocked(interaction.reply).mock.calls[0][0] as {
      embeds: EmbedBuilder[];
      ephemeral: boolean;
    };
    expect(replyCall.ephemeral).toBe(true);
    expect(replyCall.embeds[0].data.description).toContain(
      "このコマンドはサーバー内でのみ使用できます"
    );
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("コマンド実行時にログが記録される", async () => {
    const interaction = createMockInteraction({
      channelId: "ch-123",
      guildId: "guild-1",
      guildName: "My Guild",
      channelName: "general",
      userId: "user-1",
      userName: "testuser",
      hourValue: 7,
      commandName: "subscribe",
    });
    await handleSubscribe(interaction, repo, commandLogRepo);

    expect(commandLogRepo.log).toHaveBeenCalledWith({
      commandName: "subscribe",
      guildId: "guild-1",
      guildName: "My Guild",
      channelId: "ch-123",
      channelName: "general",
      userId: "user-1",
      userName: "testuser",
      userDisplayName: "Test User",
      options: "hour=7",
    });
  });

  it("複数オプションがカンマ区切りで記録される", async () => {
    const interaction = createMockInteraction({
      commandName: "subscribe",
      optionsData: [
        { name: "hour", value: 7 },
        { name: "mode", value: "all" },
      ],
    });
    await handleSubscribe(interaction, repo, commandLogRepo);

    expect(commandLogRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        options: "hour=7,mode=all",
      })
    );
  });

  it("guild.name が取得できない場合に unknown がログに記録される", async () => {
    const interaction = createMockInteraction({ guildId: "guild-1" });
    (interaction as unknown as Record<string, unknown>).guild = { name: null };
    await handleSubscribe(interaction, repo, commandLogRepo);

    expect(commandLogRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-1",
        guildName: "",
      })
    );
  });

  it("channel.name が取得できない場合に unknown がログに記録される", async () => {
    const interaction = createMockInteraction();
    (interaction as unknown as Record<string, unknown>).channel = { name: null };
    await handleSubscribe(interaction, repo, commandLogRepo);

    expect(commandLogRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        channelName: "",
      })
    );
  });

  it("channel が null の場合に unknown がログに記録される", async () => {
    const interaction = createMockInteraction();
    (interaction as unknown as Record<string, unknown>).channel = null;
    await handleSubscribe(interaction, repo, commandLogRepo);

    expect(commandLogRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        channelName: "",
      })
    );
  });

  it("ログ記録が失敗してもコマンド処理は正常に完了する", async () => {
    const failingLogRepo = createMockCommandLogRepo({
      log: vi.fn().mockRejectedValue(new Error("DB error")) as never,
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const interaction = createMockInteraction();
    await handleSubscribe(interaction, repo, failingLogRepo);

    expect(repo.upsert).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe("handleUnsubscribe", () => {
  let repo: NotificationRepository;
  let commandLogRepo: CommandLogRepository;

  beforeEach(() => {
    repo = createMockRepo();
    commandLogRepo = createMockCommandLogRepo();
  });

  it("実行チャンネル ID を解除対象として使用する", async () => {
    const interaction = createMockInteraction({ channelId: "ch-777", commandName: "unsubscribe" });
    await handleUnsubscribe(interaction, repo, commandLogRepo);

    expect(repo.remove).toHaveBeenCalledWith("guild-1", "ch-777");
  });

  it("解除成功時に応答メッセージにチャンネルを含める", async () => {
    const interaction = createMockInteraction({ channelId: "ch-777", commandName: "unsubscribe" });
    await handleUnsubscribe(interaction, repo, commandLogRepo);

    const replyCall = vi.mocked(interaction.reply).mock.calls[0][0] as {
      embeds: EmbedBuilder[];
    };
    expect(replyCall.embeds[0].data.description).toContain("<#ch-777>");
  });

  it("登録が存在しない場合に警告メッセージを返す", async () => {
    const repo = createMockRepo({ remove: vi.fn().mockResolvedValue(false) as never });
    const interaction = createMockInteraction({ channelId: "ch-404", commandName: "unsubscribe" });
    await handleUnsubscribe(interaction, repo, commandLogRepo);

    const replyCall = vi.mocked(interaction.reply).mock.calls[0][0] as {
      embeds: EmbedBuilder[];
    };
    expect(replyCall.embeds[0].data.description).toContain("通知登録は存在しません");
  });

  it("サーバー外実行時にエラーメッセージを返す", async () => {
    const interaction = createMockInteraction({ guildId: null, commandName: "unsubscribe" });
    await handleUnsubscribe(interaction, repo, commandLogRepo);

    const replyCall = vi.mocked(interaction.reply).mock.calls[0][0] as {
      embeds: EmbedBuilder[];
      ephemeral: boolean;
    };
    expect(replyCall.ephemeral).toBe(true);
    expect(replyCall.embeds[0].data.description).toContain(
      "このコマンドはサーバー内でのみ使用できます"
    );
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it("コマンド実行時にログが記録される", async () => {
    const interaction = createMockInteraction({
      channelId: "ch-123",
      guildId: "guild-1",
      guildName: "My Guild",
      channelName: "general",
      userId: "user-1",
      userName: "testuser",
      commandName: "unsubscribe",
    });
    await handleUnsubscribe(interaction, repo, commandLogRepo);

    expect(commandLogRepo.log).toHaveBeenCalledWith({
      commandName: "unsubscribe",
      guildId: "guild-1",
      guildName: "My Guild",
      channelId: "ch-123",
      channelName: "general",
      userId: "user-1",
      userName: "testuser",
      userDisplayName: "Test User",
      options: null,
    });
  });

  it("ログ記録が失敗してもコマンド処理は正常に完了する", async () => {
    const failingLogRepo = createMockCommandLogRepo({
      log: vi.fn().mockRejectedValue(new Error("DB error")) as never,
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const interaction = createMockInteraction({ commandName: "unsubscribe" });
    await handleUnsubscribe(interaction, repo, failingLogRepo);

    expect(repo.remove).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
