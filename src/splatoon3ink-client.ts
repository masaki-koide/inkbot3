import { z } from "zod/v4";

// --- 定数 ---

const USER_AGENT = "inkbot3 (Discord Bot)";
const BASE_URL = "https://splatoon3.ink";

// --- splatoon3.ink schedules.json 用 Zod スキーマ ---

const imageSchema = z.object({
  url: z.string(),
});

const vsStageSchema = z.object({
  vsStageId: z.number(),
  name: z.string(),
  image: imageSchema,
  id: z.string(),
});

const vsRuleSchema = z.object({
  name: z.string(),
  rule: z.string(),
  id: z.string(),
});

const vsSettingSchema = z.object({
  vsStages: z.array(vsStageSchema),
  vsRule: vsRuleSchema,
}).passthrough();

const bankaraMatchSettingSchema = vsSettingSchema.extend({
  bankaraMode: z.string(),
});

const regularNodeSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  regularMatchSetting: vsSettingSchema.nullable(),
  festMatchSettings: z.unknown().nullable(),
});

const bankaraNodeSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  bankaraMatchSettings: z.array(bankaraMatchSettingSchema).nullable(),
  festMatchSettings: z.unknown().nullable(),
});

const xNodeSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  xMatchSetting: vsSettingSchema.nullable(),
  festMatchSettings: z.unknown().nullable(),
});

const leagueMatchEventSchema = z.object({
  leagueMatchEventId: z.string(),
  name: z.string(),
  desc: z.string(),
  regulationUrl: z.string().nullable(),
  regulation: z.string(),
  id: z.string(),
});

const eventNodeSchema = z.object({
  leagueMatchSetting: vsSettingSchema.extend({
    leagueMatchEvent: leagueMatchEventSchema,
  }).nullable(),
  timePeriods: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
  })),
});

const festMatchSettingSchema = vsSettingSchema.extend({
  festMode: z.string().optional(),
  isTricolor: z.boolean().optional(),
}).nullable();

const festNodeSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  festMatchSettings: z.array(festMatchSettingSchema).nullable(),
});

const coopWeaponSchema = z.object({
  __splatoon3ink_id: z.string(),
  name: z.string(),
  image: imageSchema,
});

const coopStageSchema = z.object({
  name: z.string(),
  thumbnailImage: imageSchema,
  image: imageSchema,
  id: z.string(),
});

const coopBossSchema = z.object({
  name: z.string(),
  id: z.string(),
});

const coopSettingSchema = z.object({
  boss: coopBossSchema,
  coopStage: coopStageSchema,
  weapons: z.array(coopWeaponSchema),
}).passthrough();

const coopNodeSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  setting: coopSettingSchema,
});

const coopGroupingScheduleSchema = z.object({
  regularSchedules: z.object({ nodes: z.array(coopNodeSchema) }),
  bigRunSchedules: z.object({ nodes: z.array(coopNodeSchema) }),
  teamContestSchedules: z.object({ nodes: z.array(coopNodeSchema) }),
});

// --- splatoon3.ink locale/ja-JP.json 用 Zod スキーマ ---

const localeNameSchema = z.record(z.string(), z.object({
  name: z.string(),
}));

const localeEventSchema = z.record(z.string(), z.object({
  name: z.string(),
  desc: z.string(),
  regulation: z.string(),
}));

export const localeResponseSchema = z.object({
  stages: localeNameSchema,
  rules: localeNameSchema,
  weapons: localeNameSchema,
  bosses: localeNameSchema,
  events: localeEventSchema,
}).passthrough();

// --- エクスポートされる内部データ型 ---

export interface VsStage {
  readonly id: string;
  readonly vsStageId: number;
  readonly name: string;
  readonly image: string;
}

export interface VsRule {
  readonly id: string;
  readonly key: string;
  readonly name: string;
}

export interface VsScheduleEntry {
  readonly startTime: string;
  readonly endTime: string;
  readonly rule: VsRule;
  readonly stages: ReadonlyArray<VsStage>;
}

export interface LeagueMatchEvent {
  readonly id: string;
  readonly leagueMatchEventId: string;
  readonly name: string;
  readonly desc: string;
}

export interface EventScheduleEntry {
  readonly event: LeagueMatchEvent;
  readonly rule: VsRule;
  readonly stages: ReadonlyArray<VsStage>;
  readonly timePeriods: ReadonlyArray<{
    readonly startTime: string;
    readonly endTime: string;
  }>;
}

export interface FestScheduleEntry {
  readonly startTime: string;
  readonly endTime: string;
  readonly rule: VsRule | null;
  readonly stages: ReadonlyArray<VsStage> | null;
  readonly isTricolor: boolean;
  readonly tricolorStages: ReadonlyArray<VsStage> | null;
}

export interface CoopWeapon {
  readonly name: string;
  readonly image: string;
}

export interface CoopStage {
  readonly id: string;
  readonly name: string;
  readonly image: string;
}

export interface CoopBoss {
  readonly id: string;
  readonly name: string;
}

export interface CoopScheduleEntry {
  readonly startTime: string;
  readonly endTime: string;
  readonly boss: CoopBoss;
  readonly stage: CoopStage;
  readonly weapons: ReadonlyArray<CoopWeapon>;
  readonly isBigRun: boolean;
}

export interface Schedules {
  readonly regular: ReadonlyArray<VsScheduleEntry>;
  readonly bankaraChallenge: ReadonlyArray<VsScheduleEntry>;
  readonly bankaraOpen: ReadonlyArray<VsScheduleEntry>;
  readonly x: ReadonlyArray<VsScheduleEntry>;
  readonly event: ReadonlyArray<EventScheduleEntry>;
  readonly fest: ReadonlyArray<FestScheduleEntry>;
  readonly coop: ReadonlyArray<CoopScheduleEntry>;
}

export const schedulesResponseSchema = z.object({
  data: z.object({
    regularSchedules: z.object({ nodes: z.array(regularNodeSchema) }),
    bankaraSchedules: z.object({ nodes: z.array(bankaraNodeSchema) }),
    xSchedules: z.object({ nodes: z.array(xNodeSchema) }),
    eventSchedules: z.object({ nodes: z.array(eventNodeSchema) }),
    festSchedules: z.object({ nodes: z.array(festNodeSchema) }),
    coopGroupingSchedule: coopGroupingScheduleSchema,
    currentFest: z.unknown().nullable(),
    vsStages: z.object({ nodes: z.array(z.unknown()) }),
  }),
});

// --- ローカライズ型 ---

type LocaleData = z.infer<typeof localeResponseSchema>;

// --- ローカライズルックアップ ---

export function localizeName(
  localeCategory: Record<string, { name: string }>,
  id: string,
  fallbackName: string,
): string {
  return localeCategory[id]?.name ?? fallbackName;
}

// --- API レスポンス → 内部型 変換 ---

function toVsStage(raw: z.infer<typeof vsStageSchema>, locale: LocaleData): VsStage {
  return {
    id: raw.id,
    vsStageId: raw.vsStageId,
    name: localizeName(locale.stages, raw.id, raw.name),
    image: raw.image.url,
  };
}

function toVsRule(raw: z.infer<typeof vsRuleSchema>, locale: LocaleData): VsRule {
  return {
    id: raw.id,
    key: raw.rule,
    name: localizeName(locale.rules, raw.id, raw.name),
  };
}

function toVsScheduleEntry(
  startTime: string,
  endTime: string,
  setting: z.infer<typeof vsSettingSchema>,
  locale: LocaleData,
): VsScheduleEntry {
  return {
    startTime,
    endTime,
    rule: toVsRule(setting.vsRule, locale),
    stages: setting.vsStages.map((s) => toVsStage(s, locale)),
  };
}

function convertRegularSchedules(
  nodes: z.infer<typeof regularNodeSchema>[],
  locale: LocaleData,
): VsScheduleEntry[] {
  return nodes
    .filter((n) => n.regularMatchSetting !== null)
    .map((n) => toVsScheduleEntry(n.startTime, n.endTime, n.regularMatchSetting!, locale));
}

function convertBankaraSchedules(
  nodes: z.infer<typeof bankaraNodeSchema>[],
  locale: LocaleData,
  mode: "CHALLENGE" | "OPEN",
): VsScheduleEntry[] {
  const result: VsScheduleEntry[] = [];
  for (const node of nodes) {
    if (!node.bankaraMatchSettings) continue;
    const setting = node.bankaraMatchSettings.find((s) => s.bankaraMode === mode);
    if (setting) {
      result.push(toVsScheduleEntry(node.startTime, node.endTime, setting, locale));
    }
  }
  return result;
}

function convertXSchedules(
  nodes: z.infer<typeof xNodeSchema>[],
  locale: LocaleData,
): VsScheduleEntry[] {
  return nodes
    .filter((n) => n.xMatchSetting !== null)
    .map((n) => toVsScheduleEntry(n.startTime, n.endTime, n.xMatchSetting!, locale));
}

function convertEventSchedules(
  nodes: z.infer<typeof eventNodeSchema>[],
  locale: LocaleData,
): EventScheduleEntry[] {
  return nodes
    .filter((n) => n.leagueMatchSetting !== null)
    .map((n) => {
      const setting = n.leagueMatchSetting!;
      const rawEvent = setting.leagueMatchEvent;
      const localeEvent = locale.events[rawEvent.id];
      return {
        event: {
          id: rawEvent.id,
          leagueMatchEventId: rawEvent.leagueMatchEventId,
          name: localeEvent?.name ?? rawEvent.name,
          desc: localeEvent?.desc ?? rawEvent.desc,
        },
        rule: toVsRule(setting.vsRule, locale),
        stages: setting.vsStages.map((s) => toVsStage(s, locale)),
        timePeriods: n.timePeriods,
      };
    });
}

function convertFestSchedules(
  nodes: z.infer<typeof festNodeSchema>[],
  locale: LocaleData,
): FestScheduleEntry[] {
  return nodes.map((n) => {
    const settings = n.festMatchSettings;
    if (!settings || settings.length === 0 || settings[0] === null) {
      return {
        startTime: n.startTime,
        endTime: n.endTime,
        rule: null,
        stages: null,
        isTricolor: false,
        tricolorStages: null,
      };
    }
    const setting = settings[0]!;
    return {
      startTime: n.startTime,
      endTime: n.endTime,
      rule: toVsRule(setting.vsRule, locale),
      stages: setting.vsStages.map((s) => toVsStage(s, locale)),
      isTricolor: setting.isTricolor ?? false,
      tricolorStages: null,
    };
  });
}

function convertCoopSchedules(
  nodes: z.infer<typeof coopNodeSchema>[],
  locale: LocaleData,
  isBigRun: boolean,
): CoopScheduleEntry[] {
  return nodes.map((n) => ({
    startTime: n.startTime,
    endTime: n.endTime,
    boss: {
      id: n.setting.boss.id,
      name: localizeName(locale.bosses, n.setting.boss.id, n.setting.boss.name),
    },
    stage: {
      id: n.setting.coopStage.id,
      name: localizeName(locale.stages, n.setting.coopStage.id, n.setting.coopStage.name),
      image: n.setting.coopStage.image.url,
    },
    weapons: n.setting.weapons.map((w) => ({
      name: localizeName(locale.weapons, w.__splatoon3ink_id, w.name),
      image: w.image.url,
    })),
    isBigRun,
  }));
}

// --- API クライアント ---

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`splatoon3.ink API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchSchedules(): Promise<Schedules> {
  const [schedulesJson, localeJson] = await Promise.all([
    fetchJson(`${BASE_URL}/data/schedules.json`),
    fetchJson(`${BASE_URL}/data/locale/ja-JP.json`),
  ]);

  const schedulesParsed = schedulesResponseSchema.safeParse(schedulesJson);
  if (!schedulesParsed.success) {
    console.error("splatoon3.ink schedules validation error:", schedulesParsed.error.issues);
    throw new Error("スケジュールデータのバリデーションに失敗しました");
  }

  const localeParsed = localeResponseSchema.safeParse(localeJson);
  if (!localeParsed.success) {
    console.error("splatoon3.ink locale validation error:", localeParsed.error.issues);
    throw new Error("ローカライズデータのバリデーションに失敗しました");
  }

  const data = schedulesParsed.data.data;
  const locale = localeParsed.data;
  const coop = data.coopGroupingSchedule;

  return {
    regular: convertRegularSchedules(data.regularSchedules.nodes, locale),
    bankaraChallenge: convertBankaraSchedules(data.bankaraSchedules.nodes, locale, "CHALLENGE"),
    bankaraOpen: convertBankaraSchedules(data.bankaraSchedules.nodes, locale, "OPEN"),
    x: convertXSchedules(data.xSchedules.nodes, locale),
    event: convertEventSchedules(data.eventSchedules.nodes, locale),
    fest: convertFestSchedules(data.festSchedules.nodes, locale),
    coop: [
      ...convertCoopSchedules(coop.regularSchedules.nodes, locale, false),
      ...convertCoopSchedules(coop.bigRunSchedules.nodes, locale, true),
    ],
  };
}
