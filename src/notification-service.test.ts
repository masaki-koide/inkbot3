import { describe, it, expect } from "vitest";
import { formatDiscordTime, formatDiscordRelative, filterByTimeWindow, mergeConsecutiveEntries, groupEventEntries, formatScheduleEntries, formatCoopEntries, formatEventEntries, formatFestEntries, buildScheduleEmbeds } from "./notification-service.js";
import type { ScheduleEntry, EventScheduleEntry, CoopScheduleEntry, FestScheduleEntry, BattleSchedules } from "./spla3-client.js";

describe("formatDiscordTime", () => {
  it("ISO 8601文字列を<t:UNIX:f>形式（日付+時刻）に変換する", () => {
    // 2024-01-15T10:00:00Z → UNIX秒: 1705312800
    expect(formatDiscordTime("2024-01-15T10:00:00Z")).toBe("<t:1705312800:f>");
  });

  it("異なる日時でも正しくUNIX秒に変換する", () => {
    // 2024-06-01T00:00:00Z → UNIX秒: 1717200000
    expect(formatDiscordTime("2024-06-01T00:00:00Z")).toBe("<t:1717200000:f>");
  });

  it("タイムゾーンオフセット付きISO文字列を正しく変換する", () => {
    // 2024-01-15T19:00:00+09:00 は UTC 10:00:00 → 1705312800
    expect(formatDiscordTime("2024-01-15T19:00:00+09:00")).toBe("<t:1705312800:f>");
  });
});

describe("formatDiscordRelative", () => {
  it("ISO 8601文字列を<t:UNIX:R>形式に変換する", () => {
    // 2024-01-15T10:00:00Z → UNIX秒: 1705312800
    expect(formatDiscordRelative("2024-01-15T10:00:00Z")).toBe("<t:1705312800:R>");
  });

  it("異なる日時でも正しくUNIX秒に変換する", () => {
    // 2024-06-01T00:00:00Z → UNIX秒: 1717200000
    expect(formatDiscordRelative("2024-06-01T00:00:00Z")).toBe("<t:1717200000:R>");
  });

  it("タイムゾーンオフセット付きISO文字列を正しく変換する", () => {
    // 2024-01-15T19:00:00+09:00 は UTC 10:00:00 → 1705312800
    expect(formatDiscordRelative("2024-01-15T19:00:00+09:00")).toBe("<t:1705312800:R>");
  });
});

describe("filterByTimeWindow", () => {
  const now = new Date("2024-01-15T10:00:00Z");

  it("24h以内に開始するエントリのみ返す", () => {
    const entries = [
      { startTime: "2024-01-15T12:00:00Z" }, // +2h → 含む
      { startTime: "2024-01-16T08:00:00Z" }, // +22h → 含む
      { startTime: "2024-01-16T12:00:00Z" }, // +26h → 除外
    ];
    const result = filterByTimeWindow(entries, now);
    expect(result).toHaveLength(2);
    expect(result[0].startTime).toBe("2024-01-15T12:00:00Z");
    expect(result[1].startTime).toBe("2024-01-16T08:00:00Z");
  });

  it("ちょうど24h境界のエントリは含む", () => {
    const entries = [
      { startTime: "2024-01-16T10:00:00Z" }, // ちょうど+24h
    ];
    const result = filterByTimeWindow(entries, now);
    expect(result).toHaveLength(1);
  });

  it("24hを超えるエントリは除外する", () => {
    const entries = [
      { startTime: "2024-01-16T10:00:01Z" }, // +24h1s
    ];
    const result = filterByTimeWindow(entries, now);
    expect(result).toHaveLength(0);
  });

  it("空配列を入力すると空配列を返す", () => {
    const result = filterByTimeWindow([], now);
    expect(result).toHaveLength(0);
  });

  it("nowより前のstartTimeも含む", () => {
    const entries = [
      { startTime: "2024-01-15T08:00:00Z" }, // -2h → 含む（開始済みだが表示対象）
      { startTime: "2024-01-15T14:00:00Z" }, // +4h → 含む
    ];
    const result = filterByTimeWindow(entries, now);
    expect(result).toHaveLength(2);
  });
});

function makeEntry(overrides: Partial<ScheduleEntry> & { startTime: string; endTime: string }): ScheduleEntry {
  return {
    rule: { key: "area", name: "ガチエリア" },
    stages: [{ id: 1, name: "ステージA", image: "" }, { id: 2, name: "ステージB", image: "" }],
    isFest: false,
    ...overrides,
  };
}

describe("mergeConsecutiveEntries", () => {
  it("同一ルール・ステージの隣接エントリを統合する", () => {
    const entries = [
      makeEntry({ startTime: "2024-01-15T00:00:00Z", endTime: "2024-01-15T02:00:00Z" }),
      makeEntry({ startTime: "2024-01-15T02:00:00Z", endTime: "2024-01-15T04:00:00Z" }),
    ];
    const result = mergeConsecutiveEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe("2024-01-15T00:00:00Z");
    expect(result[0].endTime).toBe("2024-01-15T04:00:00Z");
  });

  it("異なるルールのエントリは統合しない", () => {
    const entries = [
      makeEntry({ startTime: "2024-01-15T00:00:00Z", endTime: "2024-01-15T02:00:00Z", rule: { key: "area", name: "ガチエリア" } }),
      makeEntry({ startTime: "2024-01-15T02:00:00Z", endTime: "2024-01-15T04:00:00Z", rule: { key: "clam", name: "ガチアサリ" } }),
    ];
    const result = mergeConsecutiveEntries(entries);
    expect(result).toHaveLength(2);
  });

  it("異なるステージのエントリは統合しない", () => {
    const entries = [
      makeEntry({ startTime: "2024-01-15T00:00:00Z", endTime: "2024-01-15T02:00:00Z", stages: [{ id: 1, name: "A", image: "" }] }),
      makeEntry({ startTime: "2024-01-15T02:00:00Z", endTime: "2024-01-15T04:00:00Z", stages: [{ id: 2, name: "B", image: "" }] }),
    ];
    const result = mergeConsecutiveEntries(entries);
    expect(result).toHaveLength(2);
  });

  it("非隣接（時間が飛んでいる）エントリは統合しない", () => {
    const entries = [
      makeEntry({ startTime: "2024-01-15T00:00:00Z", endTime: "2024-01-15T02:00:00Z" }),
      makeEntry({ startTime: "2024-01-15T04:00:00Z", endTime: "2024-01-15T06:00:00Z" }),
    ];
    const result = mergeConsecutiveEntries(entries);
    expect(result).toHaveLength(2);
  });

  it("3つ以上の連続エントリを1つに統合する", () => {
    const entries = [
      makeEntry({ startTime: "2024-01-15T00:00:00Z", endTime: "2024-01-15T02:00:00Z" }),
      makeEntry({ startTime: "2024-01-15T02:00:00Z", endTime: "2024-01-15T04:00:00Z" }),
      makeEntry({ startTime: "2024-01-15T04:00:00Z", endTime: "2024-01-15T06:00:00Z" }),
    ];
    const result = mergeConsecutiveEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe("2024-01-15T00:00:00Z");
    expect(result[0].endTime).toBe("2024-01-15T06:00:00Z");
  });

  it("空配列を入力すると空配列を返す", () => {
    expect(mergeConsecutiveEntries([])).toHaveLength(0);
  });

  it("1件のみの場合はそのまま返す", () => {
    const entries = [makeEntry({ startTime: "2024-01-15T00:00:00Z", endTime: "2024-01-15T02:00:00Z" })];
    const result = mergeConsecutiveEntries(entries);
    expect(result).toHaveLength(1);
  });
});

function makeEventEntry(overrides: Partial<EventScheduleEntry> & { startTime: string; endTime: string; event: EventScheduleEntry["event"] }): EventScheduleEntry {
  return {
    rule: { key: "area", name: "ガチエリア" },
    stages: [{ id: 1, name: "ステージA", image: "" }],
    isFest: false,
    ...overrides,
  };
}

describe("groupEventEntries", () => {
  it("同一event.idの非隣接エントリがグルーピングされる", () => {
    const entries: EventScheduleEntry[] = [
      makeEventEntry({
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-15T02:00:00Z",
        event: { id: "ev1", name: "イベントA", desc: "説明A" },
        rule: { key: "area", name: "ガチエリア" },
        stages: [{ id: 1, name: "ステージA", image: "" }],
      }),
      makeEventEntry({
        startTime: "2024-01-15T04:00:00Z",
        endTime: "2024-01-15T06:00:00Z",
        event: { id: "ev1", name: "イベントA", desc: "説明A" },
        rule: { key: "area", name: "ガチエリア" },
        stages: [{ id: 1, name: "ステージA", image: "" }],
      }),
    ];
    const result = groupEventEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].event.id).toBe("ev1");
    expect(result[0].timeRanges).toHaveLength(2);
    expect(result[0].timeRanges[0].startTime).toBe("2024-01-15T00:00:00Z");
    expect(result[0].timeRanges[0].endTime).toBe("2024-01-15T02:00:00Z");
    expect(result[0].timeRanges[1].startTime).toBe("2024-01-15T04:00:00Z");
    expect(result[0].timeRanges[1].endTime).toBe("2024-01-15T06:00:00Z");
  });

  it("異なるevent.idのエントリが別グループになる", () => {
    const entries: EventScheduleEntry[] = [
      makeEventEntry({
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-15T02:00:00Z",
        event: { id: "ev1", name: "イベントA", desc: "説明A" },
      }),
      makeEventEntry({
        startTime: "2024-01-15T02:00:00Z",
        endTime: "2024-01-15T04:00:00Z",
        event: { id: "ev2", name: "イベントB", desc: "説明B" },
      }),
    ];
    const result = groupEventEntries(entries);
    expect(result).toHaveLength(2);
    expect(result[0].event.id).toBe("ev1");
    expect(result[1].event.id).toBe("ev2");
  });

  it("空配列の入力時に空配列が返る", () => {
    const result = groupEventEntries([]);
    expect(result).toHaveLength(0);
  });

  it("グループにrule・stages・event情報が保持される", () => {
    const entries: EventScheduleEntry[] = [
      makeEventEntry({
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-15T02:00:00Z",
        event: { id: "ev1", name: "イベントA", desc: "説明A" },
        rule: { key: "clam", name: "ガチアサリ" },
        stages: [{ id: 1, name: "ステージX", image: "" }, { id: 2, name: "ステージY", image: "" }],
      }),
    ];
    const result = groupEventEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].event.name).toBe("イベントA");
    expect(result[0].event.desc).toBe("説明A");
    expect(result[0].rule.name).toBe("ガチアサリ");
    expect(result[0].stages).toHaveLength(2);
    expect(result[0].stages[0].name).toBe("ステージX");
    expect(result[0].timeRanges).toHaveLength(1);
  });
});

describe("formatScheduleEntries", () => {
  it("ルール・ステージ・時刻を表示する（タイトルなし）", () => {
    const entries: ScheduleEntry[] = [
      makeEntry({
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T12:00:00Z",
        rule: { key: "area", name: "ガチエリア" },
        stages: [{ id: 1, name: "ステージA", image: "" }, { id: 2, name: "ステージB", image: "" }],
      }),
    ];
    const result = formatScheduleEntries(entries, { omitRule: false });
    expect(result).toContain("ルール: ガチエリア");
    expect(result).toContain("ステージ: ステージA, ステージB");
    expect(result).toContain("<t:1705312800:f>");
    expect(result).toContain("<t:1705320000:f>");
    expect(result).toContain("<t:1705312800:R>");
    // タイトル見出し（**XXX**で始まる行）がないことを確認
    expect(result).not.toMatch(/^\*\*/m);
  });

  it("omitRule: trueでルール行を省略する", () => {
    const entries: ScheduleEntry[] = [
      makeEntry({
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T12:00:00Z",
        rule: { key: "turf_war", name: "ナワバリバトル" },
      }),
    ];
    const result = formatScheduleEntries(entries, { omitRule: true });
    expect(result).not.toContain("ルール:");
    expect(result).toContain("ステージ:");
  });

  it("空配列の場合はスケジュールなしを返す", () => {
    const result = formatScheduleEntries([], { omitRule: false });
    expect(result).toBe("スケジュールなし");
  });
});

function makeCoopEntry(overrides: Partial<CoopScheduleEntry> & { startTime: string; endTime: string }): CoopScheduleEntry {
  return {
    boss: { id: "boss1", name: "ヨコヅナ" },
    stage: { id: 1, name: "シェケナダム", image: "" },
    weapons: [{ name: "スプラシューター", image: "" }, { name: "スプラローラー", image: "" }],
    isBigRun: false,
    ...overrides,
  };
}

describe("formatCoopEntries", () => {
  it("Discordタイムスタンプ形式で時刻を表示する", () => {
    const entries = [makeCoopEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-16T10:00:00Z" })];
    const result = formatCoopEntries(entries);
    expect(result).toContain("<t:1705312800:f>");
    expect(result).toContain("<t:1705399200:f>");
    expect(result).toContain("<t:1705312800:R>");
    expect(result).not.toMatch(/\d+\/\d+ \d+:\d+/); // 旧形式がないこと
  });

  it("ステージ・ブキ・ボス情報を表示する", () => {
    const entries = [makeCoopEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-16T10:00:00Z" })];
    const result = formatCoopEntries(entries);
    expect(result).toContain("ステージ: シェケナダム");
    expect(result).toContain("ブキ: スプラシューター, スプラローラー");
    expect(result).toContain("ボス: ヨコヅナ");
  });

  it("ビッグラン開催時にビッグラン表示を含める", () => {
    const entries = [makeCoopEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-16T10:00:00Z", isBigRun: true })];
    const result = formatCoopEntries(entries);
    expect(result).toContain("**ビッグラン開催中！**");
  });

  it("空配列の場合はスケジュールなしを返す", () => {
    expect(formatCoopEntries([])).toBe("スケジュールなし");
  });
});

describe("formatEventEntries", () => {
  it("Discordタイムスタンプ形式で時刻を表示する", () => {
    const entries: EventScheduleEntry[] = [
      makeEventEntry({
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T12:00:00Z",
        event: { id: "ev1", name: "ゾンビラン", desc: "ゾンビになって戦え！" },
        rule: { key: "clam", name: "ガチアサリ" },
        stages: [{ id: 1, name: "ステージA", image: "" }],
      }),
    ];
    const result = formatEventEntries(entries);
    expect(result).toContain("<t:1705312800:f>");
    expect(result).toContain("<t:1705320000:f>");
    expect(result).toContain("<t:1705312800:R>");
    expect(result).not.toMatch(/\d+\/\d+ \d+:\d+/); // 旧形式がないこと
  });

  it("イベント名・説明・ルール・ステージ情報を表示する", () => {
    const entries: EventScheduleEntry[] = [
      makeEventEntry({
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T12:00:00Z",
        event: { id: "ev1", name: "ゾンビラン", desc: "ゾンビになって戦え！" },
        rule: { key: "clam", name: "ガチアサリ" },
        stages: [{ id: 1, name: "ステージA", image: "" }, { id: 2, name: "ステージB", image: "" }],
      }),
    ];
    const result = formatEventEntries(entries);
    expect(result).toContain("**ゾンビラン**");
    expect(result).toContain("ゾンビになって戦え！");
    expect(result).toContain("ルール: ガチアサリ");
    expect(result).toContain("ステージ: ステージA, ステージB");
  });

  it("同一イベントをグルーピングして時刻を列挙形式で表示する", () => {
    const entries: EventScheduleEntry[] = [
      makeEventEntry({
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-15T02:00:00Z",
        event: { id: "ev1", name: "ゾンビラン", desc: "ゾンビになって戦え！" },
      }),
      makeEventEntry({
        startTime: "2024-01-15T04:00:00Z",
        endTime: "2024-01-15T06:00:00Z",
        event: { id: "ev1", name: "ゾンビラン", desc: "ゾンビになって戦え！" },
      }),
    ];
    const result = formatEventEntries(entries);
    // イベント名は1回だけ
    const matches = result!.match(/\*\*ゾンビラン\*\*/g);
    expect(matches).toHaveLength(1);
    // 時刻が列挙形式で表示される（2つの時刻範囲がカンマ区切り）
    // 00:00〜02:00
    expect(result).toContain("<t:1705276800:f>");  // 00:00 start
    expect(result).toContain("<t:1705284000:f>");  // 02:00 end
    // 04:00〜06:00
    expect(result).toContain("<t:1705291200:f>");  // 04:00 start
    expect(result).toContain("<t:1705298400:f>");  // 06:00 end
    // 最初の時刻範囲の相対時刻
    expect(result).toContain("<t:1705276800:R>");
  });

  it("空配列の場合はnullを返す", () => {
    expect(formatEventEntries([])).toBeNull();
  });
});

function makeFestEntry(overrides: Partial<FestScheduleEntry> & { startTime: string; endTime: string }): FestScheduleEntry {
  return {
    rule: { key: "turf_war", name: "ナワバリバトル" },
    stages: [{ id: 1, name: "ステージA", image: "" }, { id: 2, name: "ステージB", image: "" }],
    isFest: true,
    isTricolor: false,
    tricolorStages: null,
    ...overrides,
  };
}

describe("formatFestEntries", () => {
  it("Discordタイムスタンプ形式で時刻を表示する", () => {
    const entries = [makeFestEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z" })];
    const result = formatFestEntries(entries);
    expect(result).toContain("<t:1705312800:f>");
    expect(result).toContain("<t:1705320000:f>");
    expect(result).toContain("<t:1705312800:R>");
    expect(result).not.toMatch(/\d+\/\d+ \d+:\d+/); // 旧形式がないこと
  });

  it("ルール・ステージ情報を表示する", () => {
    const entries = [makeFestEntry({
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T12:00:00Z",
      rule: { key: "turf_war", name: "ナワバリバトル" },
      stages: [{ id: 1, name: "ステージA", image: "" }, { id: 2, name: "ステージB", image: "" }],
    })];
    const result = formatFestEntries(entries);
    expect(result).toContain("ルール: ナワバリバトル");
    expect(result).toContain("ステージ: ステージA, ステージB");
  });

  it("トリカラ情報を表示する", () => {
    const entries = [makeFestEntry({
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T12:00:00Z",
      isTricolor: true,
      tricolorStages: [{ id: 10, name: "トリカラステージX", image: "" }],
    })];
    const result = formatFestEntries(entries);
    expect(result).toContain("トリカラステージ: トリカラステージX");
  });

  it("ruleがnullのエントリは除外する", () => {
    const entries = [makeFestEntry({
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T12:00:00Z",
      rule: null,
      stages: null,
    })];
    const result = formatFestEntries(entries);
    expect(result).toBeNull();
  });

  it("空配列の場合はnullを返す", () => {
    expect(formatFestEntries([])).toBeNull();
  });
});

describe("buildScheduleEmbeds", () => {
  const now = new Date("2024-01-15T10:00:00Z");

  function makeBattle(overrides?: Partial<BattleSchedules>): BattleSchedules {
    return {
      regular: [
        makeEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z", rule: { key: "turf_war", name: "ナワバリバトル" } }),
      ],
      bankaraChallenge: [
        makeEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z", rule: { key: "area", name: "ガチエリア" } }),
      ],
      bankaraOpen: [
        makeEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z", rule: { key: "clam", name: "ガチアサリ" } }),
      ],
      x: [
        makeEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z", rule: { key: "tower", name: "ガチヤグラ" } }),
      ],
      event: [],
      fest: [],
      festChallenge: [],
      ...overrides,
    };
  }

  const coop: CoopScheduleEntry[] = [
    makeCoopEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-16T10:00:00Z" }),
  ];

  it("通常時（イベントマッチ・フェスなし）にEmbed数が5である（バトル4+サーモンラン）", () => {
    const embeds = buildScheduleEmbeds(makeBattle(), coop, now);
    expect(embeds).toHaveLength(5);
  });

  it("各バトルEmbedのタイトルと色が正しい", () => {
    const embeds = buildScheduleEmbeds(makeBattle(), coop, now);
    expect(embeds[0].data.title).toBe("ナワバリバトル");
    expect(embeds[0].data.color).toBe(0x19d719); // Colors.Regular
    expect(embeds[1].data.title).toBe("バンカラマッチ チャレンジ");
    expect(embeds[1].data.color).toBe(0xf54910); // Colors.Bankara
    expect(embeds[2].data.title).toBe("バンカラマッチ オープン");
    expect(embeds[2].data.color).toBe(0xf54910); // Colors.Bankara
    expect(embeds[3].data.title).toBe("Xマッチ");
    expect(embeds[3].data.color).toBe(0x0fdb9b); // Colors.XMatch
  });

  it("サーモンランが独立Embedとして存在する", () => {
    const embeds = buildScheduleEmbeds(makeBattle(), coop, now);
    expect(embeds[4].data.title).toBe("サーモンラン");
    expect(embeds[4].data.color).toBe(0xff6600); // Colors.SalmonRun
  });

  it("ナワバリバトルEmbedにルール行がない", () => {
    const embeds = buildScheduleEmbeds(makeBattle(), coop, now);
    expect(embeds[0].data.description).not.toContain("ルール:");
  });

  it("バンカラ・XマッチEmbedにルール行がある", () => {
    const embeds = buildScheduleEmbeds(makeBattle(), coop, now);
    expect(embeds[1].data.description).toContain("ルール: ガチエリア");
    expect(embeds[2].data.description).toContain("ルール: ガチアサリ");
    expect(embeds[3].data.description).toContain("ルール: ガチヤグラ");
  });

  it("イベントマッチ存在時にEmbed数が6である", () => {
    const battle = makeBattle({
      event: [
        makeEventEntry({
          startTime: "2024-01-15T10:00:00Z",
          endTime: "2024-01-15T12:00:00Z",
          event: { id: "ev1", name: "ゾンビラン", desc: "説明" },
        }),
      ],
    });
    const embeds = buildScheduleEmbeds(battle, coop, now);
    expect(embeds).toHaveLength(6);
    expect(embeds[5].data.title).toBe("イベントマッチ");
    expect(embeds[5].data.color).toBe(0xe510c9); // Colors.Event
  });

  it("フェス存在時にEmbed数が6である", () => {
    const battle = makeBattle({
      fest: [
        makeFestEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z" }),
      ],
    });
    const embeds = buildScheduleEmbeds(battle, coop, now);
    expect(embeds).toHaveLength(6);
    expect(embeds[5].data.title).toBe("フェス");
  });

  it("24hフィルタで全バトルエントリが除外された場合はバトルEmbedが省略される", () => {
    const battle = makeBattle({
      regular: [makeEntry({ startTime: "2024-01-17T00:00:00Z", endTime: "2024-01-17T02:00:00Z", rule: { key: "turf_war", name: "ナワバリバトル" } })],
      bankaraChallenge: [makeEntry({ startTime: "2024-01-17T00:00:00Z", endTime: "2024-01-17T02:00:00Z" })],
      bankaraOpen: [makeEntry({ startTime: "2024-01-17T00:00:00Z", endTime: "2024-01-17T02:00:00Z" })],
      x: [makeEntry({ startTime: "2024-01-17T00:00:00Z", endTime: "2024-01-17T02:00:00Z" })],
    });
    const embeds = buildScheduleEmbeds(battle, coop, now);
    // バトルEmbed全省略、サーモンランのみ
    expect(embeds).toHaveLength(1);
    expect(embeds[0].data.title).toBe("サーモンラン");
  });

  it("24hフィルタ・連続統合が適用される", () => {
    const battle = makeBattle({
      regular: [
        makeEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z", rule: { key: "turf_war", name: "ナワバリバトル" } }),
        makeEntry({ startTime: "2024-01-15T12:00:00Z", endTime: "2024-01-15T14:00:00Z", rule: { key: "turf_war", name: "ナワバリバトル" } }),
        makeEntry({ startTime: "2024-01-17T00:00:00Z", endTime: "2024-01-17T02:00:00Z", rule: { key: "turf_war", name: "ナワバリバトル" } }), // 24h超 → 除外
      ],
    });
    const embeds = buildScheduleEmbeds(battle, coop, now);
    const regularDesc = embeds[0].data.description!;
    // 連続統合で10:00-14:00に統合されるはず
    expect(regularDesc).toContain("<t:1705312800:f>"); // 10:00
    expect(regularDesc).toContain("<t:1705327200:f>"); // 14:00
  });

  it("descriptionの文字数が4096以内である", () => {
    const embeds = buildScheduleEmbeds(makeBattle(), coop, now);
    for (const embed of embeds) {
      expect(embed.data.description!.length).toBeLessThanOrEqual(4096);
    }
  });

  it("イベントマッチとフェスが両方存在する場合にEmbed数が7である", () => {
    const battle = makeBattle({
      event: [
        makeEventEntry({
          startTime: "2024-01-15T10:00:00Z",
          endTime: "2024-01-15T12:00:00Z",
          event: { id: "ev1", name: "ゾンビラン", desc: "説明" },
        }),
      ],
      fest: [
        makeFestEntry({ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z" }),
      ],
    });
    const embeds = buildScheduleEmbeds(battle, coop, now);
    expect(embeds).toHaveLength(7);
    expect(embeds[0].data.title).toBe("ナワバリバトル");
    expect(embeds[1].data.title).toBe("バンカラマッチ チャレンジ");
    expect(embeds[2].data.title).toBe("バンカラマッチ オープン");
    expect(embeds[3].data.title).toBe("Xマッチ");
    expect(embeds[4].data.title).toBe("サーモンラン");
    expect(embeds[5].data.title).toBe("イベントマッチ");
    expect(embeds[6].data.title).toBe("フェス");
  });

  it("イベントマッチが24hフィルタで除外された場合はイベントEmbedが追加されない", () => {
    const battle = makeBattle({
      event: [
        makeEventEntry({
          startTime: "2024-01-17T00:00:00Z",
          endTime: "2024-01-17T02:00:00Z",
          event: { id: "ev1", name: "ゾンビラン", desc: "説明" },
        }),
      ],
    });
    const embeds = buildScheduleEmbeds(battle, coop, now);
    expect(embeds).toHaveLength(5);
    expect(embeds.every((e) => e.data.title !== "イベントマッチ")).toBe(true);
  });

  it("フェスが24hフィルタで除外された場合はフェスEmbedが追加されない", () => {
    const battle = makeBattle({
      fest: [
        makeFestEntry({ startTime: "2024-01-17T00:00:00Z", endTime: "2024-01-17T02:00:00Z" }),
      ],
    });
    const embeds = buildScheduleEmbeds(battle, coop, now);
    expect(embeds).toHaveLength(5);
    expect(embeds.every((e) => e.data.title !== "フェス")).toBe(true);
  });

  it("一部のバトルタイプのみ24hフィルタで除外された場合、そのEmbedだけ省略される", () => {
    const battle = makeBattle({
      regular: [makeEntry({ startTime: "2024-01-17T00:00:00Z", endTime: "2024-01-17T02:00:00Z", rule: { key: "turf_war", name: "ナワバリバトル" } })],
      // 他の3タイプは24h以内
    });
    const embeds = buildScheduleEmbeds(battle, coop, now);
    // ナワバリバトルのみ省略: バンカラC + バンカラO + X + サーモンラン = 4
    expect(embeds).toHaveLength(4);
    expect(embeds[0].data.title).toBe("バンカラマッチ チャレンジ");
  });
});
