import { z } from "zod/v4";

const configSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
  DISCORD_APPLICATION_ID: z.string().min(1, "DISCORD_APPLICATION_ID is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

export interface Config {
  readonly discordToken: string;
  readonly discordApplicationId: string;
  readonly databaseUrl: string;
}

export function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(`環境変数の設定エラー:\n${errors}`);
    process.exit(1);
  }

  return {
    discordToken: result.data.DISCORD_TOKEN,
    discordApplicationId: result.data.DISCORD_APPLICATION_ID,
    databaseUrl: result.data.DATABASE_URL,
  };
}
