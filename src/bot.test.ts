import { describe, it, expect } from "vitest";
import { ApplicationCommandOptionType } from "discord.js";
import { commands } from "./bot.js";

describe("commands", () => {
  const subscribeCmd = commands.find((c) => c.name === "subscribe")!;
  const unsubscribeCmd = commands.find((c) => c.name === "unsubscribe")!;

  describe("subscribe", () => {
    it("channel オプションを持たない", () => {
      const json = subscribeCmd.toJSON();
      const channelOption = json.options?.find(
        (o) => o.name === "channel"
      );
      expect(channelOption).toBeUndefined();
    });

    it("hour オプションが任意である", () => {
      const json = subscribeCmd.toJSON();
      const hourOption = json.options?.find((o) => o.name === "hour");
      expect(hourOption).toBeDefined();
      expect(hourOption!.required).toBeFalsy();
    });

    it("hour オプションの値域が 0〜23 である", () => {
      const json = subscribeCmd.toJSON();
      const hourOption = json.options?.find((o) => o.name === "hour");
      expect(hourOption).toBeDefined();
      if (
        hourOption != null &&
        hourOption.type === ApplicationCommandOptionType.Integer
      ) {
        expect(hourOption.min_value).toBe(0);
        expect(hourOption.max_value).toBe(23);
      } else {
        expect.unreachable("hour オプションが Integer 型で存在すること");
      }
    });
  });

  describe("unsubscribe", () => {
    it("channel オプションを持たない", () => {
      const json = unsubscribeCmd.toJSON();
      const channelOption = json.options?.find(
        (o) => o.name === "channel"
      );
      expect(channelOption).toBeUndefined();
    });
  });
});
