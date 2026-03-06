import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbedBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import type { NotificationRepository } from "./notification-repository.js";
import { handleSubscribe, handleUnsubscribe } from "./command-handler.js";

function createMockInteraction(
  overrides: {
    channelId?: string;
    guildId?: string | null;
    hourValue?: number | null;
  } = {}
) {
  const { channelId = "ch-123", guildId = "guild-1", hourValue = null } = overrides;
  return {
    channelId,
    guildId,
    options: {
      getInteger: vi.fn((name: string, _required?: boolean) => {
        if (name === "hour") return hourValue;
        return null;
      }),
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

describe("handleSubscribe", () => {
  let repo: NotificationRepository;

  beforeEach(() => {
    repo = createMockRepo();
  });

  it("実行チャンネル ID を通知先として使用する", async () => {
    const interaction = createMockInteraction({ channelId: "ch-999" });
    await handleSubscribe(interaction, repo);

    expect(repo.upsert).toHaveBeenCalledWith("guild-1", "ch-999", expect.any(Number));
  });

  it("hour オプション省略時にデフォルト値 7 で登録する", async () => {
    const interaction = createMockInteraction({ hourValue: null });
    await handleSubscribe(interaction, repo);

    expect(repo.upsert).toHaveBeenCalledWith("guild-1", "ch-123", 7);
  });

  it("hour オプション指定時にその値で登録する", async () => {
    const interaction = createMockInteraction({ hourValue: 14 });
    await handleSubscribe(interaction, repo);

    expect(repo.upsert).toHaveBeenCalledWith("guild-1", "ch-123", 14);
  });

  it("応答メッセージにチャンネルと通知時刻を含める", async () => {
    const interaction = createMockInteraction({ channelId: "ch-500", hourValue: 9 });
    await handleSubscribe(interaction, repo);

    const replyCall = vi.mocked(interaction.reply).mock.calls[0][0] as {
      embeds: EmbedBuilder[];
    };
    const description = replyCall.embeds[0].data.description;
    expect(description).toContain("<#ch-500>");
    expect(description).toContain("9時");
  });

  it("サーバー外実行時にエラーメッセージを返す", async () => {
    const interaction = createMockInteraction({ guildId: null });
    await handleSubscribe(interaction, repo);

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
});

describe("handleUnsubscribe", () => {
  let repo: NotificationRepository;

  beforeEach(() => {
    repo = createMockRepo();
  });

  it("実行チャンネル ID を解除対象として使用する", async () => {
    const interaction = createMockInteraction({ channelId: "ch-777" });
    await handleUnsubscribe(interaction, repo);

    expect(repo.remove).toHaveBeenCalledWith("guild-1", "ch-777");
  });

  it("解除成功時に応答メッセージにチャンネルを含める", async () => {
    const interaction = createMockInteraction({ channelId: "ch-777" });
    await handleUnsubscribe(interaction, repo);

    const replyCall = vi.mocked(interaction.reply).mock.calls[0][0] as {
      embeds: EmbedBuilder[];
    };
    expect(replyCall.embeds[0].data.description).toContain("<#ch-777>");
  });

  it("登録が存在しない場合に警告メッセージを返す", async () => {
    const repo = createMockRepo({ remove: vi.fn().mockResolvedValue(false) as never });
    const interaction = createMockInteraction({ channelId: "ch-404" });
    await handleUnsubscribe(interaction, repo);

    const replyCall = vi.mocked(interaction.reply).mock.calls[0][0] as {
      embeds: EmbedBuilder[];
    };
    expect(replyCall.embeds[0].data.description).toContain("通知登録は存在しません");
  });

  it("サーバー外実行時にエラーメッセージを返す", async () => {
    const interaction = createMockInteraction({ guildId: null });
    await handleUnsubscribe(interaction, repo);

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
});
