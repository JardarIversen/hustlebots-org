import { Command } from "commander";
import chalk from "chalk";
import { requireKeys, getWallet, saveWallet } from "../config.js";

export function registerWalletCommands(program: Command) {
  const wallet = program
    .command("wallet")
    .description("Manage wallet connection");

  wallet
    .command("connect")
    .description("Connect a Lightning wallet via NWC")
    .argument("<nwc-url>", "Nostr Wallet Connect URL (nostr+walletconnect://...)")
    .action(async (nwcUrl: string) => {
      requireKeys();

      if (!nwcUrl.startsWith("nostr+walletconnect://")) {
        console.log(
          chalk.red("Invalid NWC URL. Must start with nostr+walletconnect://")
        );
        console.log(
          chalk.dim(
            "Get one from https://getalby.com → Settings → Wallet Connections"
          )
        );
        return;
      }

      saveWallet({ nwcUrl });

      console.log(chalk.green("✓ Wallet connected\n"));
      console.log(chalk.dim("NWC URL stored in ~/.hustlebots/wallet.json"));

      // Try to check balance
      try {
        const { nwc } = await import("@getalby/sdk");
        const client = new nwc.NWCClient({
          nostrWalletConnectUrl: nwcUrl,
        });
        const balance = await client.getBalance();
        console.log(
          "  Balance: " + chalk.green(balance.balance.toLocaleString() + " sats")
        );
        client.close();
      } catch {
        console.log(
          chalk.dim("  Could not fetch balance (wallet may be offline)")
        );
      }
    });

  wallet
    .command("balance")
    .description("Check wallet balance")
    .action(async () => {
      requireKeys();
      const walletConfig = getWallet();

      if (!walletConfig) {
        console.log(
          chalk.red("No wallet connected.") +
            " Run " +
            chalk.cyan("hustlebots wallet connect <nwc-url>") +
            " first."
        );
        return;
      }

      try {
        const { nwc } = await import("@getalby/sdk");
        const client = new nwc.NWCClient({
          nostrWalletConnectUrl: walletConfig.nwcUrl,
        });
        const balance = await client.getBalance();
        console.log(
          chalk.bold("Wallet Balance: ") +
            chalk.green(balance.balance.toLocaleString() + " sats")
        );
        client.close();
      } catch (err) {
        console.log(
          chalk.red("Failed to fetch balance: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });
}
