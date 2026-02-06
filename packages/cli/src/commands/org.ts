import { Command } from "commander";
import chalk from "chalk";
import { requireKeys, getDefaultOrg, setDefaultOrg, resolveContact, getWallet } from "../config.js";
import { api } from "../api.js";
import type { ApiSuccess, ApiList, Org, OrgMember } from "@hustlebots/shared";

export function registerOrgCommands(program: Command) {
  const org = program
    .command("org")
    .description("Manage organizations");

  org
    .command("create")
    .description("Create a new organization")
    .argument("<name>", "Organization name")
    .action(async (name: string) => {
      requireKeys();

      try {
        const result = await api.post<ApiSuccess<Org>>("/api/orgs", { name });
        const o = result.data;

        // Set as default org
        setDefaultOrg(o.id);

        console.log(chalk.green("✓ Org created\n"));
        console.log("  Name: " + chalk.white(o.name));
        console.log("  ID:   " + chalk.dim(o.id));
        console.log("  Role: " + chalk.cyan("owner"));
        console.log(
          "\n" + chalk.dim("Set as default org. Fund it with: hustlebots org fund")
        );
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  org
    .command("fund")
    .description("Connect a wallet to the org for payroll")
    .option("--org <id>", "Org ID (uses default if not specified)")
    .action(async (options) => {
      requireKeys();
      const orgId = options.org || getDefaultOrg();
      if (!orgId) {
        console.log(
          chalk.red("No org specified.") +
            " Use --org <id> or create one with " +
            chalk.cyan("hustlebots org create")
        );
        return;
      }

      const wallet = getWallet();
      if (!wallet) {
        console.log(
          chalk.red("No wallet connected.") +
            " Connect one first with " +
            chalk.cyan("hustlebots wallet connect <nwc-url>")
        );
        return;
      }

      try {
        await api.post(`/api/orgs/${orgId}/fund`, {
          nwcUrl: wallet.nwcUrl,
        });

        console.log(chalk.green("✓ Org wallet connected\n"));
        console.log(chalk.dim("The org can now run payroll using your wallet."));
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  org
    .command("info")
    .description("Show org details")
    .option("--org <id>", "Org ID (uses default if not specified)")
    .action(async (options) => {
      requireKeys();
      const orgId = options.org || getDefaultOrg();
      if (!orgId) {
        console.log(chalk.red("No org specified."));
        return;
      }

      try {
        const result = await api.get<ApiSuccess<Org & { myRole: string }>>(`/api/orgs/${orgId}`);
        const o = result.data;

        console.log(chalk.bold("Org: " + o.name + "\n"));
        console.log("  ID:      " + chalk.dim(o.id));
        console.log("  Owner:   " + chalk.cyan(o.ownerNpub.slice(0, 20) + "..."));
        console.log("  Role:    " + chalk.white(o.myRole));
        console.log(
          "  Wallet:  " +
            (o.nwcUrl ? chalk.green("connected") : chalk.yellow("not connected"))
        );
        console.log("  Created: " + chalk.dim(o.createdAt));
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  org
    .command("members")
    .description("List org members")
    .option("--org <id>", "Org ID (uses default if not specified)")
    .action(async (options) => {
      requireKeys();
      const orgId = options.org || getDefaultOrg();
      if (!orgId) {
        console.log(chalk.red("No org specified."));
        return;
      }

      try {
        const result = await api.get<ApiList<OrgMember>>(`/api/orgs/${orgId}/members`);

        if (result.data.length === 0) {
          console.log(chalk.dim("No members."));
          return;
        }

        console.log(chalk.bold("Members\n"));
        for (const m of result.data) {
          const roleColor =
            m.role === "owner"
              ? chalk.yellow
              : m.role === "manager"
                ? chalk.blue
                : chalk.white;
          console.log(
            "  " +
              roleColor(`[${m.role}]`.padEnd(10)) +
              chalk.cyan(m.npub.slice(0, 24) + "...")
          );
        }
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  org
    .command("promote")
    .description("Promote a member to manager (owner only)")
    .argument("<agent>", "Agent name (@name) or npub")
    .option("--role <role>", "Role to assign", "manager")
    .option("--org <id>", "Org ID (uses default if not specified)")
    .action(async (agent: string, options) => {
      requireKeys();
      const orgId = options.org || getDefaultOrg();
      if (!orgId) {
        console.log(chalk.red("No org specified."));
        return;
      }

      const npub = resolveContact(agent);

      try {
        await api.post(`/api/orgs/${orgId}/members`, {
          npub,
          role: options.role,
        });

        console.log(
          chalk.green("✓ ") +
            chalk.cyan(agent) +
            " promoted to " +
            chalk.white(options.role)
        );
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });
}
