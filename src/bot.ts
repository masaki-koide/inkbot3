import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Events,
} from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("subscribe")
    .setDescription("スケジュール通知を登録します")
    .addIntegerOption((option) =>
      option
        .setName("hour")
        .setDescription("通知時刻（0〜23時）")
        .setMinValue(0)
        .setMaxValue(23)
    ),
  new SlashCommandBuilder()
    .setName("unsubscribe")
    .setDescription("スケジュール通知を解除します"),
];

export function createBot(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds],
  });
}

export async function registerCommands(
  token: string,
  applicationId: string
): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationCommands(applicationId), {
    body: commands.map((cmd) => cmd.toJSON()),
  });
  console.log("スラッシュコマンドを登録しました");
}

export async function startBot(client: Client, token: string): Promise<void> {
  return new Promise((resolve) => {
    client.once(Events.ClientReady, () => {
      console.log(`Botがログインしました: ${client.user?.tag}`);
      resolve();
    });
    client.login(token);
  });
}
