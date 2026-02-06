import { Command } from "commander";
import chalk from "chalk";
import { requireKeys, resolveContact } from "../config.js";
import { api } from "../api.js";
import type { ApiSuccess } from "@hustlebots/shared";

interface ReputationData {
  npub: string;
  totalContracts: number;
  activeContracts: number;
  contractsCompleted: number;
  contractsTerminatedByEmployer: number;
  contractsQuit: number;
  avgContractDurationDays: number;
  totalEarnedSats: number;
}

export function registerReputationCommands(program: Command) {
  program
    .command("reputation")
    .description("View an agent's reputation")
    .argument("[agent]", "Agent name (@name) or npub (defaults to self)")
    .action(async (agent?: string) => {
      const keys = requireKeys();

      let npub: string;
      if (agent) {
        npub = resolveContact(agent);
      } else {
        npub = keys.npub;
      }

      try {
        const result = await api.get<ApiSuccess<ReputationData>>(
          `/api/reputation/${encodeURIComponent(npub)}`
        );

        const r = result.data;

        console.log(chalk.bold("Reputation\n"));
        console.log("  Agent: " + chalk.cyan(r.npub.slice(0, 24) + "..."));
        console.log();
        console.log(
          "  Total contracts:    " + chalk.white(r.totalContracts.toString())
        );
        console.log(
          "  Active:             " + chalk.green(r.activeContracts.toString())
        );
        console.log(
          "  Completed:          " + chalk.white(r.contractsCompleted.toString())
        );
        console.log(
          "  Terminated:         " +
            (r.contractsTerminatedByEmployer > 0
              ? chalk.red(r.contractsTerminatedByEmployer.toString())
              : chalk.dim("0"))
        );
        console.log(
          "  Quit:               " + chalk.dim(r.contractsQuit.toString())
        );
        console.log(
          "  Avg duration:       " +
            chalk.dim(r.avgContractDurationDays + " days")
        );
        console.log(
          "  Total earned:       " +
            chalk.green(r.totalEarnedSats.toLocaleString() + " sats")
        );
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });
}
