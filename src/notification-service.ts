import { type Client, EmbedBuilder, TextChannel } from "discord.js";
import {
  fetchSchedules,
  type Schedules,
  type VsScheduleEntry,
  type EventScheduleEntry,
  type FestScheduleEntry,
  type CoopScheduleEntry,
  type VsRule,
  type VsStage,
} from "./splatoon3ink-client.js";
import { Colors } from "./colors.js";

export function formatDiscordTime(isoString: string): string {
  const unixSeconds = Math.floor(new Date(isoString).getTime() / 1000);
  return `<t:${unixSeconds}:f>`;
}

export function formatDiscordRelative(isoString: string): string {
  const unixSeconds = Math.floor(new Date(isoString).getTime() / 1000);
  return `<t:${unixSeconds}:R>`;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function filterByTimeWindow<T extends { readonly startTime: string; readonly endTime: string }>(
  entries: ReadonlyArray<T>,
  now: Date
): ReadonlyArray<T> {
  const nowMs = now.getTime();
  const cutoff = nowMs + TWENTY_FOUR_HOURS_MS;
  return entries.filter((entry) =>
    new Date(entry.endTime).getTime() > nowMs &&
    new Date(entry.startTime).getTime() <= cutoff
  );
}

export function mergeConsecutiveEntries(
  entries: ReadonlyArray<VsScheduleEntry>
): ReadonlyArray<VsScheduleEntry> {
  if (entries.length === 0) return [];

  const result: VsScheduleEntry[] = [{ ...entries[0] }];

  for (let i = 1; i < entries.length; i++) {
    const prev = result[result.length - 1];
    const curr = entries[i];

    const isAdjacent = prev.endTime === curr.startTime;
    const sameRule = prev.rule.key === curr.rule.key;
    const sameStages =
      prev.stages.length === curr.stages.length &&
      prev.stages.every((s, idx) => s.id === curr.stages[idx].id);

    if (isAdjacent && sameRule && sameStages) {
      result[result.length - 1] = { ...prev, endTime: curr.endTime };
    } else {
      result.push({ ...curr });
    }
  }

  return result;
}

export function formatScheduleEntries(
  entries: ReadonlyArray<VsScheduleEntry>,
  options: { readonly omitRule: boolean }
): string {
  if (entries.length === 0) return "スケジュールなし";

  const lines: string[] = [];
  for (const entry of entries) {
    const time = `${formatDiscordTime(entry.startTime)} 〜 ${formatDiscordTime(entry.endTime)} (${formatDiscordRelative(entry.startTime)})`;
    const stages = entry.stages.map((s) => s.name).join(", ");
    lines.push(time);
    if (!options.omitRule) {
      lines.push(`ルール: ${entry.rule.name}`);
    }
    lines.push(`ステージ: ${stages}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function filterEventsByTimeWindow(
  entries: ReadonlyArray<EventScheduleEntry>,
  now: Date
): ReadonlyArray<EventScheduleEntry> {
  const nowMs = now.getTime();
  const cutoff = nowMs + TWENTY_FOUR_HOURS_MS;

  const result: EventScheduleEntry[] = [];
  for (const entry of entries) {
    const filteredPeriods = entry.timePeriods.filter(
      (tp) =>
        new Date(tp.endTime).getTime() > nowMs &&
        new Date(tp.startTime).getTime() <= cutoff
    );
    if (filteredPeriods.length > 0) {
      result.push({ ...entry, timePeriods: filteredPeriods });
    }
  }
  return result;
}

export function formatEventEntries(
  entries: ReadonlyArray<EventScheduleEntry>
): string | null {
  if (entries.length === 0) return null;

  return entries
    .map((entry) => {
      const timeRangeTexts = entry.timePeriods.map(
        (tr) => `${formatDiscordTime(tr.startTime)} 〜 ${formatDiscordTime(tr.endTime)}`
      );
      const time = `${timeRangeTexts.join(", ")} (${formatDiscordRelative(entry.timePeriods[0].startTime)})`;
      const stages = entry.stages.map((s) => s.name).join(", ");
      return `**${entry.event.name}**\n${entry.event.desc}\n${time}\nルール: ${entry.rule.name}\nステージ: ${stages}`;
    })
    .join("\n\n");
}

export function formatFestEntries(
  entries: ReadonlyArray<FestScheduleEntry>
): string | null {
  const active = entries.filter((e) => e.rule !== null && e.stages !== null);
  if (active.length === 0) return null;

  return active
    .map((entry) => {
      const time = `${formatDiscordTime(entry.startTime)} 〜 ${formatDiscordTime(entry.endTime)} (${formatDiscordRelative(entry.startTime)})`;
      const stages = entry.stages!.map((s) => s.name).join(", ");
      const lines = [`**${time}**`, `ルール: ${entry.rule!.name}`, `ステージ: ${stages}`];
      if (entry.isTricolor && entry.tricolorStages && entry.tricolorStages.length > 0) {
        lines.push(
          `トリカラステージ: ${entry.tricolorStages.map((s) => s.name).join(", ")}`
        );
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatCoopEntries(
  entries: ReadonlyArray<CoopScheduleEntry>
): string {
  if (entries.length === 0) return "スケジュールなし";

  return entries
    .map((entry) => {
      const time = `${formatDiscordTime(entry.startTime)} 〜 ${formatDiscordTime(entry.endTime)} (${formatDiscordRelative(entry.startTime)})`;
      const weapons = entry.weapons.map((w) => w.name).join(", ");
      const lines = [
        `**${time}**`,
        `ステージ: ${entry.stage.name}`,
        `ブキ: ${weapons}`,
        `ボス: ${entry.boss.name}`,
      ];
      if (entry.isBigRun) {
        lines.push("**ビッグラン開催中！**");
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export function buildScheduleEmbeds(
  schedules: Schedules,
  now: Date
): EmbedBuilder[] {
  const embeds: EmbedBuilder[] = [];

  // バトル4タイプ: 個別Embed（24hフィルタ → 連続統合 → フォーマット）
  const battleTypes: {
    title: string;
    entries: ReadonlyArray<VsScheduleEntry>;
    color: number;
    omitRule: boolean;
  }[] = [
    { title: "ナワバリバトル", entries: schedules.regular, color: Colors.Regular, omitRule: true },
    { title: "バンカラマッチ チャレンジ", entries: schedules.bankaraChallenge, color: Colors.Bankara, omitRule: false },
    { title: "バンカラマッチ オープン", entries: schedules.bankaraOpen, color: Colors.Bankara, omitRule: false },
    { title: "Xマッチ", entries: schedules.x, color: Colors.XMatch, omitRule: false },
  ];

  for (const { title, entries, color, omitRule } of battleTypes) {
    const filtered = mergeConsecutiveEntries(filterByTimeWindow(entries, now));
    if (filtered.length > 0) {
      embeds.push(
        new EmbedBuilder()
          .setColor(color)
          .setTitle(title)
          .setDescription(formatScheduleEntries(filtered, { omitRule }))
      );
    }
  }

  // サーモンラン: 独立Embed
  embeds.push(
    new EmbedBuilder()
      .setColor(Colors.SalmonRun)
      .setTitle("サーモンラン")
      .setDescription(formatCoopEntries(filterByTimeWindow(schedules.coop, now)))
  );

  // イベントマッチ: データ存在時のみ
  const filteredEvents = filterEventsByTimeWindow(schedules.event, now);
  const eventText = formatEventEntries(filteredEvents);
  if (eventText) {
    embeds.push(
      new EmbedBuilder()
        .setColor(Colors.Event)
        .setTitle("イベントマッチ")
        .setDescription(eventText)
    );
  }

  // フェス: データ存在時のみ
  const filteredFest = filterByTimeWindow(schedules.fest, now);
  const festText = formatFestEntries(filteredFest);
  if (festText) {
    embeds.push(
      new EmbedBuilder()
        .setColor(Colors.Fest)
        .setTitle("フェス")
        .setDescription(festText)
    );
  }

  return embeds;
}

export async function sendScheduleNotification(
  client: Client,
  channelId: string
): Promise<void> {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || !(channel instanceof TextChannel)) {
    console.warn(
      `チャンネル ${channelId} が見つからないか、テキストチャンネルではありません。スキップします。`
    );
    return;
  }

  let schedules: Schedules;

  try {
    schedules = await fetchSchedules();
  } catch (error) {
    console.error("スケジュールデータの取得に失敗しました:", error);
    try {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Error)
            .setTitle("スケジュール取得エラー")
            .setDescription(
              "スケジュールデータの取得に失敗しました。しばらくしてから再度お試しください。"
            ),
        ],
      });
    } catch (sendError) {
      console.error(
        `チャンネル ${channelId} へのエラーメッセージ送信に失敗しました:`,
        sendError
      );
    }
    return;
  }

  const embeds = buildScheduleEmbeds(schedules, new Date());

  // Discord APIの制限: 1メッセージあたり最大10 Embed
  const chunks: EmbedBuilder[][] = [];
  for (let i = 0; i < embeds.length; i += 10) {
    chunks.push(embeds.slice(i, i + 10));
  }

  try {
    for (const chunk of chunks) {
      await channel.send({ embeds: chunk });
    }
  } catch (error) {
    console.error(
      `チャンネル ${channelId} への通知送信に失敗しました:`,
      error
    );
  }
}
