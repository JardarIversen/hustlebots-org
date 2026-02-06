import { Command } from "commander";
import chalk from "chalk";
import { requireKeys, getDefaultOrg } from "../config.js";
import { api } from "../api.js";
import type { ApiSuccess } from "@hustlebots/shared";

interface PayrollResult {
  message: string;
  payments: {
    contractId: string;
    employee: string;
    amount: number;
    status: string;
    error?: string;
    testMode?: boolean;
  }[];
}

interface PayrollStatus {
  activeContracts: number;
  totalWeeklyPayroll: number;
  recentPayments: {
    id: string;
    contractId: string;
    amountSats: number;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }[];
}

export function registerPayrollCommands(program: Command) {
  const payroll = program
    .command("payroll")
    .description("Manage payroll");

  payroll
    .command("run")
    .description("Trigger payroll for all active contracts (owner only)")
    .option("--org <id>", "Org ID (uses default if not specified)")
    .action(async (options) => {
      requireKeys();
      const orgId = options.org || getDefaultOrg();
      if (!orgId) {
        console.log(chalk.red("No org specified."));
        return;
      }

      console.log(chalk.dim("Running payroll...\n"));

      try {
        const result = await api.post<ApiSuccess<PayrollResult>>(
          "/api/payroll",
          { orgId }
        );

        const data = result.data;
        console.log(chalk.bold(data.message + "\n"));

        for (const p of data.payments) {
          const statusIcon =
            p.status === "paid" ? chalk.green("✓") : chalk.red("✗");
          const testLabel = p.testMode ? chalk.dim(" [test]") : "";

          console.log(
            "  " +
              statusIcon +
              " " +
              chalk.cyan(p.employee.slice(0, 20) + "...") +
              "  " +
              chalk.green(p.amount.toLocaleString() + " sats") +
              testLabel
          );

          if (p.error) {
            console.log("    " + chalk.red(p.error));
          }
        }
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  payroll
    .command("status")
    .description("Show payroll status and upcoming payments")
    .option("--org <id>", "Org ID (uses default if not specified)")
    .action(async (options) => {
      requireKeys();
      const orgId = options.org || getDefaultOrg();
      if (!orgId) {
        console.log(chalk.red("No org specified."));
        return;
      }

      try {
        const result = await api.get<ApiSuccess<PayrollStatus>>(
          `/api/payroll?org=${orgId}`
        );

        const data = result.data;

        console.log(chalk.bold("Payroll Status\n"));
        console.log(
          "  Active contracts: " + chalk.white(data.activeContracts.toString())
        );
        console.log(
          "  Weekly payroll:   " +
            chalk.green(data.totalWeeklyPayroll.toLocaleString() + " sats")
        );

        if (data.recentPayments.length > 0) {
          console.log(chalk.bold("\nRecent Payments\n"));
          for (const p of data.recentPayments.slice(0, 10)) {
            const statusIcon =
              p.status === "paid" ? chalk.green("✓") : chalk.red("✗");
            const date = p.paidAt
              ? new Date(p.paidAt).toLocaleDateString()
              : "pending";
            console.log(
              "  " +
                statusIcon +
                " " +
                chalk.green(p.amountSats.toLocaleString() + " sats") +
                "  " +
                chalk.dim(date) +
                "  " +
                chalk.dim(p.contractId.slice(0, 20) + "...")
            );
          }
        }
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });

  payroll
    .command("history")
    .description("Show payment history")
    .option("--org <id>", "Org ID (uses default if not specified)")
    .action(async (options) => {
      requireKeys();
      const orgId = options.org || getDefaultOrg();
      if (!orgId) {
        console.log(chalk.red("No org specified."));
        return;
      }

      try {
        const result = await api.get<ApiSuccess<PayrollStatus>>(
          `/api/payroll?org=${orgId}`
        );

        const data = result.data;

        if (data.recentPayments.length === 0) {
          console.log(chalk.dim("No payment history."));
          return;
        }

        console.log(chalk.bold("Payment History\n"));

        let totalPaid = 0;
        let totalFailed = 0;

        for (const p of data.recentPayments) {
          const statusIcon =
            p.status === "paid" ? chalk.green("✓") : chalk.red("✗");
          const date = p.paidAt
            ? new Date(p.paidAt).toLocaleDateString()
            : new Date(p.createdAt).toLocaleDateString();

          console.log(
            "  " +
              statusIcon +
              " " +
              chalk.dim(date.padEnd(12)) +
              chalk.green(p.amountSats.toLocaleString().padStart(10) + " sats") +
              "  " +
              chalk.dim(p.status)
          );

          if (p.status === "paid") totalPaid += p.amountSats;
          else totalFailed += p.amountSats;
        }

        console.log(
          "\n  Total paid:   " +
            chalk.green(totalPaid.toLocaleString() + " sats")
        );
        if (totalFailed > 0) {
          console.log(
            "  Total failed: " +
              chalk.red(totalFailed.toLocaleString() + " sats")
          );
        }
      } catch (err) {
        console.error(
          chalk.red("Failed: ") +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    });
}
