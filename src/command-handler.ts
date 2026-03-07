import {
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
  Events,
} from "discord.js";
import type { NotificationRepository } from "./notification-repository.js";
import type { CommandLogRepository } from "./command-log-repository.js";
import { Colors } from "./colors.js";

export function setupCommandHandler(
  client: Client,
  repo: NotificationRepository,
  commandLogRepo: CommandLogRepository
): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "subscribe") {
      await handleSubscribe(interaction, repo, commandLogRepo);
    } else if (interaction.commandName === "unsubscribe") {
      await handleUnsubscribe(interaction, repo, commandLogRepo);
    }
  });
}

async function logCommandEvent(
  interaction: ChatInputCommandInteraction,
  commandLogRepo: CommandLogRepository
): Promise<void> {
  try {
    const options = interaction.options.data.length > 0
      ? interaction.options.data.map((o) => `${o.name}=${o.value}`).join(",")
      : null;

    await commandLogRepo.log({
      commandName: interaction.commandName,
      guildId: interaction.guildId ?? "",
      guildName: interaction.guild?.name ?? "",
      channelId: interaction.channelId,
      channelName: interaction.channel && "name" in interaction.channel ? interaction.channel.name ?? "" : "",
      userId: interaction.user.id,
      userName: interaction.user.username,
      userDisplayName: interaction.member && "displayName" in interaction.member ? interaction.member.displayName ?? "" : "",
      options,
    });
  } catch (error) {
    console.error("コマンドログ記録エラー:", error);
  }
}

export async function handleSubscribe(
  interaction: ChatInputCommandInteraction,
  repo: NotificationRepository,
  commandLogRepo: CommandLogRepository
): Promise<void> {
  const channelId = interaction.channelId;
  const hour = interaction.options.getInteger("hour", false) ?? 7;
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Error)
          .setDescription("このコマンドはサーバー内でのみ使用できます"),
      ],
      ephemeral: true,
    });
    return;
  }

  await logCommandEvent(interaction, commandLogRepo);

  try {
    const existing = await repo.findByGuildAndChannel(guildId, channelId);
    await repo.upsert(guildId, channelId, hour);

    const embed = new EmbedBuilder().setColor(Colors.Success);

    if (existing) {
      embed.setTitle("通知設定を更新しました").setDescription(
        `チャンネル: <#${channelId}>\n通知時刻: 毎日 ${hour}時`
      );
    } else {
      embed.setTitle("通知を登録しました").setDescription(
        `チャンネル: <#${channelId}>\n通知時刻: 毎日 ${hour}時`
      );
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("通知登録エラー:", error);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Error)
          .setDescription("通知の登録中にエラーが発生しました"),
      ],
      ephemeral: true,
    });
  }
}

export async function handleUnsubscribe(
  interaction: ChatInputCommandInteraction,
  repo: NotificationRepository,
  commandLogRepo: CommandLogRepository
): Promise<void> {
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Error)
          .setDescription("このコマンドはサーバー内でのみ使用できます"),
      ],
      ephemeral: true,
    });
    return;
  }

  await logCommandEvent(interaction, commandLogRepo);

  try {
    const removed = await repo.remove(guildId, channelId);

    const embed = new EmbedBuilder();

    if (removed) {
      embed
        .setColor(Colors.Success)
        .setTitle("通知を解除しました")
        .setDescription(`チャンネル: <#${channelId}>`);
    } else {
      embed
        .setColor(Colors.Warning)
        .setTitle("登録が見つかりません")
        .setDescription(
          `<#${channelId}> の通知登録は存在しません`
        );
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("通知解除エラー:", error);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Error)
          .setDescription("通知の解除中にエラーが発生しました"),
      ],
      ephemeral: true,
    });
  }
}
