import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  schedulesResponseSchema,
  localeResponseSchema,
  fetchSchedules,
  localizeName,
  type VsStage,
  type VsRule,
  type VsScheduleEntry,
  type LeagueMatchEvent,
  type EventScheduleEntry,
  type FestScheduleEntry,
  type CoopWeapon,
  type CoopStage,
  type CoopBoss,
  type CoopScheduleEntry,
  type Schedules,
} from "./splatoon3ink-client.js";

describe("schedulesResponseSchema", () => {
  function makeVsStage(id = "VnNTdGFnZS0x", vsStageId = 1, name = "Scorch Gorge") {
    return {
      vsStageId,
      name,
      image: { url: "https://example.com/stage.png" },
      id,
    };
  }

  function makeVsRule(id = "VnNSdWxlLTA=", name = "Turf War", rule = "TURF_WAR") {
    return { name, rule, id };
  }

  function makeRegularNode() {
    return {
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T12:00:00Z",
      regularMatchSetting: {
        __isVsSetting: "RegularMatchSetting",
        __typename: "RegularMatchSetting",
        vsStages: [makeVsStage(), makeVsStage("VnNTdGFnZS0y", 2, "Eeltail Alley")],
        vsRule: makeVsRule(),
      },
      festMatchSettings: null,
    };
  }

  function makeBankaraNode() {
    return {
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T12:00:00Z",
      bankaraMatchSettings: [
        {
          __isVsSetting: "BankaraMatchSetting",
          __typename: "BankaraMatchSetting",
          vsStages: [makeVsStage()],
          vsRule: makeVsRule("VnNSdWxlLTE=", "Splat Zones", "AREA"),
          bankaraMode: "CHALLENGE",
        },
        {
          __isVsSetting: "BankaraMatchSetting",
          __typename: "BankaraMatchSetting",
          vsStages: [makeVsStage()],
          vsRule: makeVsRule("VnNSdWxlLTI=", "Tower Control", "LOFT"),
          bankaraMode: "OPEN",
        },
      ],
      festMatchSettings: null,
    };
  }

  function makeXNode() {
    return {
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T12:00:00Z",
      xMatchSetting: {
        __isVsSetting: "XMatchSetting",
        __typename: "XMatchSetting",
        vsStages: [makeVsStage()],
        vsRule: makeVsRule("VnNSdWxlLTM=", "Rainmaker", "GOAL"),
      },
      festMatchSettings: null,
    };
  }

  function makeEventNode() {
    return {
      leagueMatchSetting: {
        leagueMatchEvent: {
          leagueMatchEventId: "SuperBeacon",
          name: "Super Jump-a-thon",
          desc: "Description here",
          regulationUrl: null,
          regulation: "Rules here",
          id: "TGVhZ3VlTWF0Y2hFdmVudC0x",
        },
        vsStages: [makeVsStage()],
        __isVsSetting: "LeagueMatchSetting",
        __typename: "LeagueMatchSetting",
        vsRule: makeVsRule(),
      },
      timePeriods: [
        { startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z" },
        { startTime: "2024-01-15T14:00:00Z", endTime: "2024-01-15T16:00:00Z" },
      ],
    };
  }

  function makeFestNode() {
    return {
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T12:00:00Z",
      festMatchSettings: null,
    };
  }

  function makeCoopNode(isBigRun = false) {
    return {
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-16T10:00:00Z",
      setting: {
        __typename: isBigRun ? "CoopBigRunSetting" : "CoopNormalSetting",
        boss: { name: "Megalodontia", id: "Q29vcEVuZW15LTI1" },
        coopStage: {
          name: "Gone Fission Hydroplant",
          thumbnailImage: { url: "https://example.com/thumb.png" },
          image: { url: "https://example.com/stage.png" },
          id: "Q29vcFN0YWdlLTc=",
        },
        __isCoopSetting: isBigRun ? "CoopBigRunSetting" : "CoopNormalSetting",
        weapons: [
          {
            __splatoon3ink_id: "fe3b9b3b87ca491e",
            name: "Slosher",
            image: { url: "https://example.com/weapon.png" },
          },
        ],
      },
    };
  }

  function makeValidResponse() {
    return {
      data: {
        regularSchedules: { nodes: [makeRegularNode()] },
        bankaraSchedules: { nodes: [makeBankaraNode()] },
        xSchedules: { nodes: [makeXNode()] },
        eventSchedules: { nodes: [makeEventNode()] },
        festSchedules: { nodes: [makeFestNode()] },
        coopGroupingSchedule: {
          regularSchedules: { nodes: [makeCoopNode()] },
          bigRunSchedules: { nodes: [] },
          teamContestSchedules: { nodes: [] },
        },
        currentFest: null,
        vsStages: { nodes: [] },
      },
    };
  }

  it("正常なレスポンスをパースできる", () => {
    const result = schedulesResponseSchema.safeParse(makeValidResponse());
    expect(result.success).toBe(true);
  });

  it("regularSchedules のノードが正しくパースされる", () => {
    const result = schedulesResponseSchema.parse(makeValidResponse());
    const node = result.data.regularSchedules.nodes[0];
    expect(node.startTime).toBe("2024-01-15T10:00:00Z");
    expect(node.endTime).toBe("2024-01-15T12:00:00Z");
    expect(node.regularMatchSetting!.vsStages).toHaveLength(2);
    expect(node.regularMatchSetting!.vsRule.rule).toBe("TURF_WAR");
  });

  it("bankaraSchedules で CHALLENGE と OPEN の両方を含む", () => {
    const result = schedulesResponseSchema.parse(makeValidResponse());
    const settings = result.data.bankaraSchedules.nodes[0].bankaraMatchSettings;
    expect(settings).toHaveLength(2);
    expect(settings![0].bankaraMode).toBe("CHALLENGE");
    expect(settings![1].bankaraMode).toBe("OPEN");
  });

  it("eventSchedules で timePeriods が正しくパースされる", () => {
    const result = schedulesResponseSchema.parse(makeValidResponse());
    const event = result.data.eventSchedules.nodes[0];
    expect(event.timePeriods).toHaveLength(2);
    expect(event.leagueMatchSetting!.leagueMatchEvent.leagueMatchEventId).toBe("SuperBeacon");
  });

  it("coopGroupingSchedule の regularSchedules がパースされる", () => {
    const result = schedulesResponseSchema.parse(makeValidResponse());
    const coop = result.data.coopGroupingSchedule.regularSchedules.nodes[0];
    expect(coop.setting.boss.name).toBe("Megalodontia");
    expect(coop.setting.coopStage.name).toBe("Gone Fission Hydroplant");
    expect(coop.setting.weapons).toHaveLength(1);
    expect(coop.setting.weapons[0].__splatoon3ink_id).toBe("fe3b9b3b87ca491e");
  });

  it("festSchedules の festMatchSettings が null のノードをパースできる", () => {
    const result = schedulesResponseSchema.parse(makeValidResponse());
    const fest = result.data.festSchedules.nodes[0];
    expect(fest.festMatchSettings).toBeNull();
  });

  it("bigRunSchedules が空配列でもパースできる", () => {
    const result = schedulesResponseSchema.parse(makeValidResponse());
    expect(result.data.coopGroupingSchedule.bigRunSchedules.nodes).toHaveLength(0);
  });

  it("bigRunSchedules にエントリがあってもパースできる", () => {
    const response = makeValidResponse();
    (response.data.coopGroupingSchedule.bigRunSchedules.nodes as unknown[]) = [makeCoopNode(true)];
    const result = schedulesResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("bankaraMatchSettings が null（フェス中）でもパースできる", () => {
    const response = makeValidResponse();
    response.data.bankaraSchedules.nodes[0].bankaraMatchSettings = null as any;
    const result = schedulesResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("不正なレスポンスでバリデーションエラーになる", () => {
    const result = schedulesResponseSchema.safeParse({ data: {} });
    expect(result.success).toBe(false);
  });
});

describe("localeResponseSchema", () => {
  function makeValidLocale() {
    return {
      stages: {
        "VnNTdGFnZS0x": { name: "ユノハナ大渓谷" },
        "VnNTdGFnZS0y": { name: "ゴンズイ地区" },
      },
      rules: {
        "VnNSdWxlLTA=": { name: "ナワバリバトル" },
      },
      weapons: {
        "67b2e7ac4bf64e71": { name: "ドライブワイパー" },
      },
      bosses: {
        "Q29vcEVuZW15LTIz": { name: "ヨコヅナ" },
      },
      events: {
        "TGVhZ3VlTWF0Y2hFdmVudC0x": {
          name: "スーパーラインマーカーバトル",
          desc: "説明テキスト",
          regulation: "ルール説明",
        },
      },
    };
  }

  it("正常なロケールデータをパースできる", () => {
    const result = localeResponseSchema.safeParse(makeValidLocale());
    expect(result.success).toBe(true);
  });

  it("stages の name を取得できる", () => {
    const result = localeResponseSchema.parse(makeValidLocale());
    expect(result.stages["VnNTdGFnZS0x"].name).toBe("ユノハナ大渓谷");
  });

  it("rules の name を取得できる", () => {
    const result = localeResponseSchema.parse(makeValidLocale());
    expect(result.rules["VnNSdWxlLTA="].name).toBe("ナワバリバトル");
  });

  it("weapons の name を取得できる", () => {
    const result = localeResponseSchema.parse(makeValidLocale());
    expect(result.weapons["67b2e7ac4bf64e71"].name).toBe("ドライブワイパー");
  });

  it("bosses の name を取得できる", () => {
    const result = localeResponseSchema.parse(makeValidLocale());
    expect(result.bosses["Q29vcEVuZW15LTIz"].name).toBe("ヨコヅナ");
  });

  it("events の name, desc, regulation を取得できる", () => {
    const result = localeResponseSchema.parse(makeValidLocale());
    const event = result.events["TGVhZ3VlTWF0Y2hFdmVudC0x"];
    expect(event.name).toBe("スーパーラインマーカーバトル");
    expect(event.desc).toBe("説明テキスト");
    expect(event.regulation).toBe("ルール説明");
  });

  it("空のカテゴリでもパースできる", () => {
    const locale = makeValidLocale();
    locale.stages = {} as typeof locale.stages;
    locale.weapons = {} as typeof locale.weapons;
    const result = localeResponseSchema.safeParse(locale);
    expect(result.success).toBe(true);
  });

  it("必須カテゴリが欠けているとバリデーションエラーになる", () => {
    const result = localeResponseSchema.safeParse({ stages: {} });
    expect(result.success).toBe(false);
  });
});

describe("エクスポートされる型定義", () => {
  it("VsStage 型が正しいフィールドを持つ", () => {
    const stage: VsStage = {
      id: "VnNTdGFnZS0x",
      vsStageId: 1,
      name: "ユノハナ大渓谷",
      image: "https://example.com/stage.png",
    };
    expect(stage.id).toBe("VnNTdGFnZS0x");
    expect(stage.vsStageId).toBe(1);
    expect(stage.name).toBe("ユノハナ大渓谷");
    expect(stage.image).toBe("https://example.com/stage.png");
  });

  it("VsRule 型が正しいフィールドを持つ", () => {
    const rule: VsRule = {
      id: "VnNSdWxlLTA=",
      key: "TURF_WAR",
      name: "ナワバリバトル",
    };
    expect(rule.key).toBe("TURF_WAR");
    expect(rule.name).toBe("ナワバリバトル");
  });

  it("VsScheduleEntry 型が正しいフィールドを持つ", () => {
    const entry: VsScheduleEntry = {
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T12:00:00Z",
      rule: { id: "VnNSdWxlLTA=", key: "TURF_WAR", name: "ナワバリバトル" },
      stages: [{ id: "VnNTdGFnZS0x", vsStageId: 1, name: "ユノハナ大渓谷", image: "https://example.com/stage.png" }],
    };
    expect(entry.startTime).toBe("2024-01-15T10:00:00Z");
    expect(entry.stages).toHaveLength(1);
  });

  it("EventScheduleEntry 型が timePeriods を持つ", () => {
    const entry: EventScheduleEntry = {
      event: { id: "ev1", leagueMatchEventId: "SuperBeacon", name: "イベント", desc: "説明" },
      rule: { id: "VnNSdWxlLTA=", key: "TURF_WAR", name: "ナワバリバトル" },
      stages: [],
      timePeriods: [{ startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z" }],
    };
    expect(entry.timePeriods).toHaveLength(1);
    expect(entry.event.leagueMatchEventId).toBe("SuperBeacon");
  });

  it("FestScheduleEntry 型が nullable フィールドを持つ", () => {
    const entry: FestScheduleEntry = {
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T12:00:00Z",
      rule: null,
      stages: null,
      isTricolor: false,
      tricolorStages: null,
    };
    expect(entry.rule).toBeNull();
    expect(entry.stages).toBeNull();
  });

  it("CoopScheduleEntry 型が正しいフィールドを持つ", () => {
    const weapon: CoopWeapon = { name: "スプラシューター", image: "https://example.com/weapon.png" };
    const stage: CoopStage = { id: "Q29vcFN0YWdlLTc=", name: "シェケナダム", image: "https://example.com/stage.png" };
    const boss: CoopBoss = { id: "Q29vcEVuZW15LTIz", name: "ヨコヅナ" };
    const entry: CoopScheduleEntry = {
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-16T10:00:00Z",
      boss,
      stage,
      weapons: [weapon],
      isBigRun: false,
    };
    expect(entry.boss.name).toBe("ヨコヅナ");
    expect(entry.weapons).toHaveLength(1);
    expect(entry.isBigRun).toBe(false);
  });

  it("Schedules 型が全スケジュール種別を持つ", () => {
    const schedules: Schedules = {
      regular: [],
      bankaraChallenge: [],
      bankaraOpen: [],
      x: [],
      event: [],
      fest: [],
      coop: [],
    };
    expect(schedules.regular).toHaveLength(0);
    expect(schedules.coop).toHaveLength(0);
  });
});

describe("fetchSchedules", () => {
  const originalFetch = globalThis.fetch;

  function makeVsStageRaw(id = "VnNTdGFnZS0x", vsStageId = 1, name = "Scorch Gorge") {
    return { vsStageId, name, image: { url: "https://example.com/stage.png" }, id };
  }

  function makeVsRuleRaw(id = "VnNSdWxlLTA=", name = "Turf War", rule = "TURF_WAR") {
    return { name, rule, id };
  }

  function makeSchedulesResponse() {
    return {
      data: {
        regularSchedules: { nodes: [{
          startTime: "2024-01-15T10:00:00Z",
          endTime: "2024-01-15T12:00:00Z",
          regularMatchSetting: {
            __isVsSetting: "RegularMatchSetting",
            __typename: "RegularMatchSetting",
            vsStages: [makeVsStageRaw()],
            vsRule: makeVsRuleRaw(),
          },
          festMatchSettings: null,
        }] },
        bankaraSchedules: { nodes: [{
          startTime: "2024-01-15T10:00:00Z",
          endTime: "2024-01-15T12:00:00Z",
          bankaraMatchSettings: [{
            __isVsSetting: "BankaraMatchSetting",
            __typename: "BankaraMatchSetting",
            vsStages: [makeVsStageRaw()],
            vsRule: makeVsRuleRaw("VnNSdWxlLTE=", "Splat Zones", "AREA"),
            bankaraMode: "CHALLENGE",
          }, {
            __isVsSetting: "BankaraMatchSetting",
            __typename: "BankaraMatchSetting",
            vsStages: [makeVsStageRaw()],
            vsRule: makeVsRuleRaw("VnNSdWxlLTI=", "Tower Control", "LOFT"),
            bankaraMode: "OPEN",
          }],
          festMatchSettings: null,
        }] },
        xSchedules: { nodes: [{
          startTime: "2024-01-15T10:00:00Z",
          endTime: "2024-01-15T12:00:00Z",
          xMatchSetting: {
            __isVsSetting: "XMatchSetting",
            __typename: "XMatchSetting",
            vsStages: [makeVsStageRaw()],
            vsRule: makeVsRuleRaw("VnNSdWxlLTM=", "Rainmaker", "GOAL"),
          },
          festMatchSettings: null,
        }] },
        eventSchedules: { nodes: [] },
        festSchedules: { nodes: [] },
        coopGroupingSchedule: {
          regularSchedules: { nodes: [{
            startTime: "2024-01-15T10:00:00Z",
            endTime: "2024-01-16T10:00:00Z",
            setting: {
              __typename: "CoopNormalSetting",
              boss: { name: "Megalodontia", id: "Q29vcEVuZW15LTI1" },
              coopStage: {
                name: "Gone Fission Hydroplant",
                thumbnailImage: { url: "https://example.com/thumb.png" },
                image: { url: "https://example.com/stage.png" },
                id: "Q29vcFN0YWdlLTc=",
              },
              __isCoopSetting: "CoopNormalSetting",
              weapons: [{
                __splatoon3ink_id: "fe3b9b3b87ca491e",
                name: "Slosher",
                image: { url: "https://example.com/weapon.png" },
              }],
            },
          }] },
          bigRunSchedules: { nodes: [] },
          teamContestSchedules: { nodes: [] },
        },
        currentFest: null,
        vsStages: { nodes: [] },
      },
    };
  }

  function makeLocaleResponse() {
    return {
      stages: { "VnNTdGFnZS0x": { name: "ユノハナ大渓谷" } },
      rules: { "VnNSdWxlLTA=": { name: "ナワバリバトル" }, "VnNSdWxlLTE=": { name: "ガチエリア" }, "VnNSdWxlLTI=": { name: "ガチヤグラ" }, "VnNSdWxlLTM=": { name: "ガチホコバトル" } },
      weapons: { "fe3b9b3b87ca491e": { name: "バケットスロッシャー" } },
      bosses: { "Q29vcEVuZW15LTI1": { name: "ジョー" } },
      events: {},
    };
  }

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("schedules.json と locale/ja-JP.json を並行取得して Schedules を返す", async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("schedules.json")) {
        return new Response(JSON.stringify(makeSchedulesResponse()), { status: 200 });
      }
      if (urlStr.includes("locale/ja-JP.json")) {
        return new Response(JSON.stringify(makeLocaleResponse()), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${urlStr}`);
    });

    const result = await fetchSchedules();

    expect(result.regular).toHaveLength(1);
    expect(result.bankaraChallenge).toHaveLength(1);
    expect(result.bankaraOpen).toHaveLength(1);
    expect(result.x).toHaveLength(1);
    expect(result.coop).toHaveLength(1);
  });

  it("User-Agent ヘッダーを設定する", async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockImplementation(async () => {
      return new Response(JSON.stringify(makeSchedulesResponse()), { status: 200 });
    });
    // locale も返す
    mockFetch.mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("schedules.json")) {
        return new Response(JSON.stringify(makeSchedulesResponse()), { status: 200 });
      }
      return new Response(JSON.stringify(makeLocaleResponse()), { status: 200 });
    });

    await fetchSchedules();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    for (const call of mockFetch.mock.calls) {
      const options = call[1] as RequestInit;
      expect((options.headers as Record<string, string>)["User-Agent"]).toBe("inkbot3 (Discord Bot)");
    }
  });

  it("schedules.json の HTTP エラーで例外をスローする", async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("schedules.json")) {
        return new Response("Server Error", { status: 500, statusText: "Internal Server Error" });
      }
      return new Response(JSON.stringify(makeLocaleResponse()), { status: 200 });
    });

    await expect(fetchSchedules()).rejects.toThrow("splatoon3.ink API error");
  });

  it("locale/ja-JP.json の HTTP エラーで例外をスローする", async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("schedules.json")) {
        return new Response(JSON.stringify(makeSchedulesResponse()), { status: 200 });
      }
      return new Response("Not Found", { status: 404, statusText: "Not Found" });
    });

    await expect(fetchSchedules()).rejects.toThrow("splatoon3.ink API error");
  });

  it("schedules.json のバリデーションエラーで例外をスローする", async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("schedules.json")) {
        return new Response(JSON.stringify({ data: {} }), { status: 200 });
      }
      return new Response(JSON.stringify(makeLocaleResponse()), { status: 200 });
    });

    await expect(fetchSchedules()).rejects.toThrow("スケジュールデータのバリデーションに失敗しました");
  });
});

describe("localizeName", () => {
  const localeCategory: Record<string, { name: string }> = {
    "VnNTdGFnZS0x": { name: "ユノハナ大渓谷" },
    "VnNSdWxlLTA=": { name: "ナワバリバトル" },
  };

  it("ID がロケールデータに存在する場合は日本語名を返す", () => {
    expect(localizeName(localeCategory, "VnNTdGFnZS0x", "Scorch Gorge")).toBe("ユノハナ大渓谷");
  });

  it("ID がロケールデータに存在しない場合は英語名をフォールバックする", () => {
    expect(localizeName(localeCategory, "unknown-id", "Eeltail Alley")).toBe("Eeltail Alley");
  });

  it("空のロケールカテゴリでもフォールバックする", () => {
    expect(localizeName({}, "VnNTdGFnZS0x", "Scorch Gorge")).toBe("Scorch Gorge");
  });
});

describe("fetchSchedules の変換ロジック", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function makeVsStageRaw(id = "VnNTdGFnZS0x", vsStageId = 1, name = "Scorch Gorge") {
    return { vsStageId, name, image: { url: "https://example.com/stage.png" }, id };
  }

  function makeVsRuleRaw(id = "VnNSdWxlLTA=", name = "Turf War", rule = "TURF_WAR") {
    return { name, rule, id };
  }

  function makeLocaleResponse() {
    return {
      stages: { "VnNTdGFnZS0x": { name: "ユノハナ大渓谷" } },
      rules: { "VnNSdWxlLTA=": { name: "ナワバリバトル" }, "VnNSdWxlLTE=": { name: "ガチエリア" }, "VnNSdWxlLTI=": { name: "ガチヤグラ" }, "VnNSdWxlLTM=": { name: "ガチホコバトル" } },
      weapons: { "fe3b9b3b87ca491e": { name: "バケットスロッシャー" } },
      bosses: { "Q29vcEVuZW15LTI1": { name: "ジョー" } },
      events: {
        "TGVhZ3VlTWF0Y2hFdmVudC0x": {
          name: "スーパーラインマーカーバトル",
          desc: "説明テキスト",
          regulation: "ルール説明",
        },
      },
    };
  }

  function setupMockFetch(schedulesResponse: unknown, localeResponse = makeLocaleResponse()) {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("schedules.json")) {
        return new Response(JSON.stringify(schedulesResponse), { status: 200 });
      }
      return new Response(JSON.stringify(localeResponse), { status: 200 });
    });
  }

  function makeBaseSchedulesResponse(overrides: Record<string, unknown> = {}) {
    return {
      data: {
        regularSchedules: { nodes: [] },
        bankaraSchedules: { nodes: [] },
        xSchedules: { nodes: [] },
        eventSchedules: { nodes: [] },
        festSchedules: { nodes: [] },
        coopGroupingSchedule: {
          regularSchedules: { nodes: [] },
          bigRunSchedules: { nodes: [] },
          teamContestSchedules: { nodes: [] },
        },
        currentFest: null,
        vsStages: { nodes: [] },
        ...overrides,
      },
    };
  }

  it("ステージ名がロケールデータでローカライズされる", async () => {
    const response = makeBaseSchedulesResponse({
      regularSchedules: { nodes: [{
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T12:00:00Z",
        regularMatchSetting: {
          vsStages: [makeVsStageRaw("VnNTdGFnZS0x", 1, "Scorch Gorge")],
          vsRule: makeVsRuleRaw(),
        },
        festMatchSettings: null,
      }] },
    });
    setupMockFetch(response);

    const result = await fetchSchedules();
    expect(result.regular[0].stages[0].name).toBe("ユノハナ大渓谷");
  });

  it("ロケールデータに存在しないステージは英語名がフォールバックされる", async () => {
    const response = makeBaseSchedulesResponse({
      regularSchedules: { nodes: [{
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T12:00:00Z",
        regularMatchSetting: {
          vsStages: [makeVsStageRaw("unknown-stage-id", 99, "Unknown Stage")],
          vsRule: makeVsRuleRaw(),
        },
        festMatchSettings: null,
      }] },
    });
    setupMockFetch(response);

    const result = await fetchSchedules();
    expect(result.regular[0].stages[0].name).toBe("Unknown Stage");
  });

  it("ルール名がロケールデータでローカライズされる", async () => {
    const response = makeBaseSchedulesResponse({
      regularSchedules: { nodes: [{
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T12:00:00Z",
        regularMatchSetting: {
          vsStages: [makeVsStageRaw()],
          vsRule: makeVsRuleRaw("VnNSdWxlLTA=", "Turf War", "TURF_WAR"),
        },
        festMatchSettings: null,
      }] },
    });
    setupMockFetch(response);

    const result = await fetchSchedules();
    expect(result.regular[0].rule.name).toBe("ナワバリバトル");
  });

  it("バンカラスケジュールが CHALLENGE と OPEN に分離される", async () => {
    const response = makeBaseSchedulesResponse({
      bankaraSchedules: { nodes: [{
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T12:00:00Z",
        bankaraMatchSettings: [{
          vsStages: [makeVsStageRaw()],
          vsRule: makeVsRuleRaw("VnNSdWxlLTE=", "Splat Zones", "AREA"),
          bankaraMode: "CHALLENGE",
        }, {
          vsStages: [makeVsStageRaw()],
          vsRule: makeVsRuleRaw("VnNSdWxlLTI=", "Tower Control", "LOFT"),
          bankaraMode: "OPEN",
        }],
        festMatchSettings: null,
      }] },
    });
    setupMockFetch(response);

    const result = await fetchSchedules();
    expect(result.bankaraChallenge).toHaveLength(1);
    expect(result.bankaraChallenge[0].rule.key).toBe("AREA");
    expect(result.bankaraOpen).toHaveLength(1);
    expect(result.bankaraOpen[0].rule.key).toBe("LOFT");
  });

  it("イベントの name と desc がローカライズされる", async () => {
    const response = makeBaseSchedulesResponse({
      eventSchedules: { nodes: [{
        leagueMatchSetting: {
          leagueMatchEvent: {
            leagueMatchEventId: "SuperBeacon",
            name: "Super Jump-a-thon",
            desc: "Description here",
            regulationUrl: null,
            regulation: "Rules here",
            id: "TGVhZ3VlTWF0Y2hFdmVudC0x",
          },
          vsStages: [makeVsStageRaw()],
          vsRule: makeVsRuleRaw(),
        },
        timePeriods: [
          { startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z" },
        ],
      }] },
    });
    setupMockFetch(response);

    const result = await fetchSchedules();
    expect(result.event[0].event.name).toBe("スーパーラインマーカーバトル");
    expect(result.event[0].event.desc).toBe("説明テキスト");
  });

  it("ロケールにないイベントは英語名がフォールバックされる", async () => {
    const response = makeBaseSchedulesResponse({
      eventSchedules: { nodes: [{
        leagueMatchSetting: {
          leagueMatchEvent: {
            leagueMatchEventId: "UnknownEvent",
            name: "Unknown Event",
            desc: "Unknown Description",
            regulationUrl: null,
            regulation: "Unknown Rules",
            id: "unknown-event-id",
          },
          vsStages: [makeVsStageRaw()],
          vsRule: makeVsRuleRaw(),
        },
        timePeriods: [
          { startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T12:00:00Z" },
        ],
      }] },
    });
    setupMockFetch(response);

    const result = await fetchSchedules();
    expect(result.event[0].event.name).toBe("Unknown Event");
    expect(result.event[0].event.desc).toBe("Unknown Description");
  });

  it("ブキ名が __splatoon3ink_id (hex) でローカライズされる", async () => {
    const response = makeBaseSchedulesResponse({
      coopGroupingSchedule: {
        regularSchedules: { nodes: [{
          startTime: "2024-01-15T10:00:00Z",
          endTime: "2024-01-16T10:00:00Z",
          setting: {
            boss: { name: "Megalodontia", id: "Q29vcEVuZW15LTI1" },
            coopStage: {
              name: "Gone Fission Hydroplant",
              thumbnailImage: { url: "https://example.com/thumb.png" },
              image: { url: "https://example.com/stage.png" },
              id: "Q29vcFN0YWdlLTc=",
            },
            weapons: [{
              __splatoon3ink_id: "fe3b9b3b87ca491e",
              name: "Slosher",
              image: { url: "https://example.com/weapon.png" },
            }],
          },
        }] },
        bigRunSchedules: { nodes: [] },
        teamContestSchedules: { nodes: [] },
      },
    });
    setupMockFetch(response);

    const result = await fetchSchedules();
    expect(result.coop[0].weapons[0].name).toBe("バケットスロッシャー");
  });

  it("ボス名がローカライズされる", async () => {
    const response = makeBaseSchedulesResponse({
      coopGroupingSchedule: {
        regularSchedules: { nodes: [{
          startTime: "2024-01-15T10:00:00Z",
          endTime: "2024-01-16T10:00:00Z",
          setting: {
            boss: { name: "Megalodontia", id: "Q29vcEVuZW15LTI1" },
            coopStage: {
              name: "Gone Fission Hydroplant",
              thumbnailImage: { url: "https://example.com/thumb.png" },
              image: { url: "https://example.com/stage.png" },
              id: "Q29vcFN0YWdlLTc=",
            },
            weapons: [{
              __splatoon3ink_id: "fe3b9b3b87ca491e",
              name: "Slosher",
              image: { url: "https://example.com/weapon.png" },
            }],
          },
        }] },
        bigRunSchedules: { nodes: [] },
        teamContestSchedules: { nodes: [] },
      },
    });
    setupMockFetch(response);

    const result = await fetchSchedules();
    expect(result.coop[0].boss.name).toBe("ジョー");
  });

  it("bigRun エントリが isBigRun: true でマージされる", async () => {
    const coopNode = {
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-16T10:00:00Z",
      setting: {
        boss: { name: "Megalodontia", id: "Q29vcEVuZW15LTI1" },
        coopStage: {
          name: "Gone Fission Hydroplant",
          thumbnailImage: { url: "https://example.com/thumb.png" },
          image: { url: "https://example.com/stage.png" },
          id: "Q29vcFN0YWdlLTc=",
        },
        weapons: [{
          __splatoon3ink_id: "fe3b9b3b87ca491e",
          name: "Slosher",
          image: { url: "https://example.com/weapon.png" },
        }],
      },
    };
    const response = makeBaseSchedulesResponse({
      coopGroupingSchedule: {
        regularSchedules: { nodes: [coopNode] },
        bigRunSchedules: { nodes: [coopNode] },
        teamContestSchedules: { nodes: [] },
      },
    });
    setupMockFetch(response);

    const result = await fetchSchedules();
    expect(result.coop).toHaveLength(2);
    expect(result.coop[0].isBigRun).toBe(false);
    expect(result.coop[1].isBigRun).toBe(true);
  });
});
