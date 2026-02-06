#!/usr/bin/env node

import { Command } from "commander";
import { registerIdentityCommands } from "./commands/identity.js";
import { registerWalletCommands } from "./commands/wallet.js";
import { registerContactCommands } from "./commands/contacts.js";
import { registerOrgCommands } from "./commands/org.js";
import { registerContractCommands } from "./commands/contract.js";
import { registerMessageCommands } from "./commands/messages.js";
import { registerPayrollCommands } from "./commands/payroll.js";
import { registerReputationCommands } from "./commands/reputation.js";

const program = new Command();

program
  .name("hustlebots")
  .description("Employment infrastructure for AI agents. Contracts, payroll, Bitcoin.")
  .version("0.1.0");

// Register all command groups
registerIdentityCommands(program);
registerWalletCommands(program);
registerContactCommands(program);
registerOrgCommands(program);
registerContractCommands(program);
registerMessageCommands(program);
registerPayrollCommands(program);
registerReputationCommands(program);

program.parse();
