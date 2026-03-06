import { z } from "zod/v4";

const USER_AGENT = "inkbot3 (Discord Bot)";
const BASE_URL = "https://spla3.yuu26.com";

// --- Zod スキーマ定義 ---

const stageSchema = z.object({
  id: z.number(),
  name: z.string(),
  image: z.string(),
});

const ruleSchema = z.object({
  key: z.string(),
  name: z.string(),
});

const scheduleEntrySchema = z.object({
  start_time: z.string(),
  end_time: z.string(),
  rule: ruleSchema,
  stages: z.array(stageSchema),
  is_fest: z.boolean(),
});

const eventScheduleEntrySchema = scheduleEntrySchema.extend({
  event: z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string(),
  }),
});

const festScheduleEntrySchema = z.object({
  start_time: z.string(),
  end_time: z.string(),
  rule: ruleSchema.nullable(),
  stages: z.array(stageSchema).nullable(),
  is_fest: z.boolean(),
  is_tricolor: z.boolean(),
  tricolor_stages: z.array(stageSchema).nullable(),
});

const battleSchedulesResponseSchema = z.object({
  result: z.object({
    regular: z.array(scheduleEntrySchema),
    bankara_challenge: z.array(scheduleEntrySchema),
    bankara_open: z.array(scheduleEntrySchema),
    x: z.array(scheduleEntrySchema),
    event: z.array(eventScheduleEntrySchema),
    fest: z.array(festScheduleEntrySchema),
    fest_challenge: z.array(festScheduleEntrySchema),
  }),
});

const coopWeaponSchema = z.object({
  name: z.string(),
  image: z.string(),
});

const coopScheduleEntrySchema = z.object({
  start_time: z.string(),
  end_time: z.string(),
  boss: z.object({
    id: z.string(),
    name: z.string(),
  }),
  stage: stageSchema,
  weapons: z.array(coopWeaponSchema),
  is_big_run: z.boolean(),
});

const coopSchedulesResponseSchema = z.object({
  results: z.array(coopScheduleEntrySchema),
});

// --- 型定義 ---

export interface Stage {
  readonly id: number;
  readonly name: string;
  readonly image: string;
}

export interface Rule {
  readonly key: string;
  readonly name: string;
}

export interface ScheduleEntry {
  readonly startTime: string;
  readonly endTime: string;
  readonly rule: Rule;
  readonly stages: ReadonlyArray<Stage>;
  readonly isFest: boolean;
}

export interface EventScheduleEntry extends ScheduleEntry {
  readonly event: {
    readonly id: string;
    readonly name: string;
    readonly desc: string;
  };
}

export interface FestScheduleEntry {
  readonly startTime: string;
  readonly endTime: string;
  readonly rule: Rule | null;
  readonly stages: ReadonlyArray<Stage> | null;
  readonly isFest: boolean;
  readonly isTricolor: boolean;
  readonly tricolorStages: ReadonlyArray<Stage> | null;
}

export interface CoopScheduleEntry {
  readonly startTime: string;
  readonly endTime: string;
  readonly boss: { readonly id: string; readonly name: string };
  readonly stage: Stage;
  readonly weapons: ReadonlyArray<{ readonly name: string; readonly image: string }>;
  readonly isBigRun: boolean;
}

export interface BattleSchedules {
  readonly regular: ReadonlyArray<ScheduleEntry>;
  readonly bankaraChallenge: ReadonlyArray<ScheduleEntry>;
  readonly bankaraOpen: ReadonlyArray<ScheduleEntry>;
  readonly x: ReadonlyArray<ScheduleEntry>;
  readonly event: ReadonlyArray<EventScheduleEntry>;
  readonly fest: ReadonlyArray<FestScheduleEntry>;
  readonly festChallenge: ReadonlyArray<FestScheduleEntry>;
}

// --- スネークケース→キャメルケース変換 ---

function toScheduleEntry(raw: z.infer<typeof scheduleEntrySchema>): ScheduleEntry {
  return {
    startTime: raw.start_time,
    endTime: raw.end_time,
    rule: raw.rule,
    stages: raw.stages,
    isFest: raw.is_fest,
  };
}

function toEventScheduleEntry(raw: z.infer<typeof eventScheduleEntrySchema>): EventScheduleEntry {
  return {
    ...toScheduleEntry(raw),
    event: raw.event,
  };
}

function toFestScheduleEntry(raw: z.infer<typeof festScheduleEntrySchema>): FestScheduleEntry {
  return {
    startTime: raw.start_time,
    endTime: raw.end_time,
    rule: raw.rule,
    stages: raw.stages,
    isFest: raw.is_fest,
    isTricolor: raw.is_tricolor,
    tricolorStages: raw.tricolor_stages,
  };
}

function toCoopScheduleEntry(raw: z.infer<typeof coopScheduleEntrySchema>): CoopScheduleEntry {
  return {
    startTime: raw.start_time,
    endTime: raw.end_time,
    boss: raw.boss,
    stage: raw.stage,
    weapons: raw.weapons,
    isBigRun: raw.is_big_run,
  };
}

// --- APIクライアント ---

export async function fetchBattleSchedules(): Promise<BattleSchedules> {
  const response = await fetch(`${BASE_URL}/api/schedule`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Spla3 API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const parsed = battleSchedulesResponseSchema.safeParse(json);

  if (!parsed.success) {
    console.error("Spla3 API battle schedule validation error:", parsed.error.issues);
    throw new Error("対戦スケジュールデータのバリデーションに失敗しました");
  }

  const result = parsed.data.result;
  return {
    regular: result.regular.map(toScheduleEntry),
    bankaraChallenge: result.bankara_challenge.map(toScheduleEntry),
    bankaraOpen: result.bankara_open.map(toScheduleEntry),
    x: result.x.map(toScheduleEntry),
    event: result.event.map(toEventScheduleEntry),
    fest: result.fest.map(toFestScheduleEntry),
    festChallenge: result.fest_challenge.map(toFestScheduleEntry),
  };
}

export async function fetchCoopSchedules(): Promise<ReadonlyArray<CoopScheduleEntry>> {
  const response = await fetch(`${BASE_URL}/api/coop-grouping/schedule`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Spla3 API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const parsed = coopSchedulesResponseSchema.safeParse(json);

  if (!parsed.success) {
    console.error("Spla3 API coop schedule validation error:", parsed.error.issues);
    throw new Error("サーモンランスケジュールデータのバリデーションに失敗しました");
  }

  return parsed.data.results.map(toCoopScheduleEntry);
}
