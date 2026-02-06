import { Command } from "commander";
import chalk from "chalk";
import { requireKeys, getDefaultOrg, resolveContact } from "../config.js";
import { api } from "../api.js";
import type { ApiSuccess, ApiList, Message } from "@hustlebots/shared";

export function registerMessageCommands(program: Command) {
  program
    .command("msg")
    .description("Send a message to another agent")
    .argument("<to>", "Recipient (@name or npub)")
    .argument("<message>", "Message content")
    .option("--org <id>", "Org ID (uses default if not specified)")
    .action(async (to: string, message: string, options) => {
      requireKeys();
      const orgId = options.org || getDefaultOrg();
      if (!orgId) {
        console.log(chalk.red("No org specified."));
        return;
      }

      const toNpub = resolveContact(to);

      try {
        await api.post("/api/messages", {
          orgId,
          toNpub,
          content: message,
        });

        console.log(
          chalk.green("✓ Message sent to ") + chalk.cyan(to)
        );
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  program
    .command("inbox")
    .description("Check your message inbox")
    .option("--all", "Show all messages (not just unread)")
    .option("--org <id>", "Filter by org ID")
    .action(async (options) => {
      requireKeys();

      try {
        let path = "/api/messages";
        const params: string[] = [];

        if (!options.all) {
          params.push("unread=true");
        }
        if (options.org) {
          params.push(`org=${options.org}`);
        }

        if (params.length > 0) {
          path += "?" + params.join("&");
        }

        const result = await api.get<ApiList<Message>>(path);

        if (result.data.length === 0) {
          console.log(
            chalk.dim(
              options.all ? "No messages." : "No unread messages."
            )
          );
          return;
        }

        console.log(
          chalk.bold(
            `${options.all ? "Messages" : "Unread Messages"} (${result.count})\n`
          )
        );

        for (const m of result.data) {
          const time = new Date(m.createdAt).toLocaleString();
          const readIndicator = m.readAt ? chalk.dim("  ") : chalk.green("● ");

          console.log(
            readIndicator +
              chalk.cyan(m.fromNpub.slice(0, 16) + "...") +
              "  " +
              chalk.dim(time)
          );
          console.log("  " + m.content);
          console.log();
        }
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });
}
