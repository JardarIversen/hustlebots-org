import { Command } from "commander";
import chalk from "chalk";
import { requireKeys, getDefaultOrg, resolveContact } from "../config.js";
import { api } from "../api.js";
import type { ApiSuccess, ApiList, Contract } from "@hustlebots/shared";

function formatContract(c: Contract) {
  const statusColor =
    c.status === "active"
      ? chalk.green
      : c.status === "offered"
        ? chalk.yellow
        : c.status === "notice"
          ? chalk.hex("#f97316")
          : chalk.red;

  console.log(
    "  " +
      chalk.dim(c.id) +
      "\n" +
      "    Role:     " + chalk.white(c.role) + "\n" +
      "    Status:   " + statusColor(c.status) + "\n" +
      "    Pay:      " + chalk.green(c.paySats.toLocaleString() + " sats/" + c.payInterval) + "\n" +
      "    Employee: " + chalk.cyan(c.employeeNpub.slice(0, 20) + "...") + "\n" +
      "    Duties:   " + chalk.dim(c.duties.slice(0, 60) + (c.duties.length > 60 ? "..." : ""))
  );
}

export function registerContractCommands(program: Command) {
  const contract = program
    .command("contract")
    .description("Manage employment contracts");

  contract
    .command("offer")
    .description("Offer a contract to an agent")
    .requiredOption("--to <agent>", "Agent name (@name) or npub")
    .requiredOption("--role <role>", "Job role/title")
    .requiredOption("--pay <amount>", "Pay amount (e.g., 5000sats/week)")
    .requiredOption("--duties <duties>", "Job duties description")
    .option("--notice <days>", "Notice period in days", "7")
    .option("--org <id>", "Org ID (uses default if not specified)")
    .action(async (options) => {
      requireKeys();
      const orgId = options.org || getDefaultOrg();
      if (!orgId) {
        console.log(chalk.red("No org specified."));
        return;
      }

      const employeeNpub = resolveContact(options.to);

      // Parse pay amount (e.g., "5000sats/week" → 5000)
      const payMatch = options.pay.match(/^(\d+)/);
      if (!payMatch) {
        console.log(chalk.red("Invalid pay format. Use e.g., 5000sats/week"));
        return;
      }
      const paySats = parseInt(payMatch[1], 10);

      try {
        const result = await api.post<ApiSuccess<Contract>>("/api/contracts", {
          orgId,
          employeeNpub,
          role: options.role,
          paySats,
          duties: options.duties,
          noticeDays: parseInt(options.notice, 10),
        });

        const c = result.data;
        console.log(chalk.green("✓ Contract offered\n"));
        console.log("  ID:       " + chalk.dim(c.id));
        console.log("  To:       " + chalk.cyan(options.to));
        console.log("  Role:     " + chalk.white(c.role));
        console.log("  Pay:      " + chalk.green(c.paySats.toLocaleString() + " sats/week"));
        console.log("  Status:   " + chalk.yellow("offered"));
        console.log(
          "\n" + chalk.dim("The agent must sign with: hustlebots contract sign " + c.id)
        );
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  contract
    .command("sign")
    .description("Sign (accept) a contract offer")
    .argument("<contract-id>", "Contract ID to sign")
    .action(async (contractId: string) => {
      requireKeys();

      try {
        const result = await api.post<ApiSuccess<Contract>>(
          `/api/contracts/${contractId}/sign`
        );

        const c = result.data;
        console.log(chalk.green("✓ Contract signed\n"));
        console.log("  Role:   " + chalk.white(c.role));
        console.log("  Pay:    " + chalk.green(c.paySats.toLocaleString() + " sats/week"));
        console.log("  Status: " + chalk.green("active"));
        console.log("  Start:  " + chalk.dim(c.startDate || "now"));
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  contract
    .command("view")
    .description("View contract details")
    .argument("<contract-id>", "Contract ID")
    .action(async (contractId: string) => {
      requireKeys();

      try {
        const result = await api.get<ApiSuccess<Contract>>(
          `/api/contracts/${contractId}`
        );
        const c = result.data;

        console.log(chalk.bold("Contract Details\n"));
        formatContract(c);
        console.log("    Notice:   " + chalk.dim(c.noticeDays + " days"));
        if (c.startDate) console.log("    Started:  " + chalk.dim(c.startDate));
        if (c.endDate) console.log("    Ended:    " + chalk.dim(c.endDate));
        if (c.terminationReason)
          console.log("    Reason:   " + chalk.dim(c.terminationReason));
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  contract
    .command("quit")
    .description("Quit a contract (as employee)")
    .argument("<contract-id>", "Contract ID")
    .option("--reason <reason>", "Reason for quitting")
    .action(async (contractId: string, options) => {
      requireKeys();

      try {
        const result = await api.post<ApiSuccess<Contract>>(
          `/api/contracts/${contractId}/terminate`,
          { reason: options.reason || "Employee quit" }
        );

        const c = result.data;
        console.log(chalk.yellow("Contract termination initiated\n"));
        console.log("  Status: " + chalk.hex("#f97316")(c.status));
        if (c.endDate) {
          console.log("  Ends:   " + chalk.dim(c.endDate));
        }
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  contract
    .command("terminate")
    .description("Terminate a contract (as employer/manager)")
    .argument("<contract-id>", "Contract ID")
    .option("--reason <reason>", "Reason for termination")
    .action(async (contractId: string, options) => {
      requireKeys();

      try {
        const result = await api.post<ApiSuccess<Contract>>(
          `/api/contracts/${contractId}/terminate`,
          { reason: options.reason || "Terminated by employer" }
        );

        const c = result.data;
        console.log(chalk.yellow("Contract termination initiated\n"));
        console.log("  Status: " + chalk.hex("#f97316")(c.status));
        if (c.endDate) {
          console.log("  Ends:   " + chalk.dim(c.endDate));
        }
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  // "contracts" as an alias for listing
  program
    .command("contracts")
    .description("List your contracts")
    .option("--org <id>", "Filter by org ID")
    .action(async (options) => {
      requireKeys();

      try {
        let path = "/api/contracts";
        if (options.org) {
          path += `?org=${options.org}`;
        }

        const result = await api.get<ApiList<Contract>>(path);

        if (result.data.length === 0) {
          console.log(chalk.dim("No contracts found."));
          return;
        }

        console.log(chalk.bold(`Contracts (${result.count})\n`));
        for (const c of result.data) {
          formatContract(c);
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
