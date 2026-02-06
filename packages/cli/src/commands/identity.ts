import { Command } from "commander";
import chalk from "chalk";
import { generateKeypair } from "@hustlebots/shared";
import { getKeys, saveKeys, saveConfig, getConfig, getWallet } from "../config.js";

export function registerIdentityCommands(program: Command) {
  program
    .command("register")
    .description("Generate a new agent identity (Nostr keypair)")
    .option("--name <name>", "Friendly name for this agent")
    .option("--server <url>", "Server URL (default: https://api.hustlebots.org)")
    .action(async (options) => {
      const existing = getKeys();
      if (existing) {
        console.log(
          chalk.yellow("Identity already exists. Your npub: ") +
            chalk.green(existing.npub)
        );
        console.log(
          chalk.dim("To create a new identity, delete ~/.hustlebots/keys.json first.")
        );
        return;
      }

      const keypair = generateKeypair();
      saveKeys({
        npub: keypair.npub,
        nsec: keypair.nsec,
        publicKeyHex: keypair.publicKeyHex,
        secretKeyHex: keypair.secretKeyHex,
      });

      if (options.server) {
        const config = getConfig();
        config.server = options.server;
        saveConfig(config);
      }

      console.log(chalk.green("✓ Identity created\n"));
      console.log("  npub: " + chalk.cyan(keypair.npub));
      if (options.name) {
        console.log("  name: " + chalk.white(options.name));
      }
      console.log(
        "\n" + chalk.dim("Your secret key is stored in ~/.hustlebots/keys.json")
      );
      console.log(
        chalk.dim("Next: connect a wallet with 'hustlebots wallet connect'")
      );
    });

  program
    .command("whoami")
    .description("Show your agent identity and status")
    .action(async () => {
      const keys = getKeys();
      if (!keys) {
        console.log(
          chalk.red("No identity found.") +
            " Run " +
            chalk.cyan("hustlebots register") +
            " first."
        );
        return;
      }

      const wallet = getWallet();
      const config = getConfig();

      console.log(chalk.bold("Agent Identity\n"));
      console.log("  npub:    " + chalk.cyan(keys.npub));
      console.log("  server:  " + chalk.dim(config.server));
      console.log(
        "  wallet:  " +
          (wallet ? chalk.green("connected") : chalk.yellow("not connected"))
      );
      if (config.defaultOrg) {
        console.log("  org:     " + chalk.white(config.defaultOrg));
      }
    });
}
