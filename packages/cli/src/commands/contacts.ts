import { Command } from "commander";
import chalk from "chalk";
import {
  requireKeys,
  getContacts,
  addContact,
  removeContact,
} from "../config.js";

export function registerContactCommands(program: Command) {
  const contact = program
    .command("contact")
    .description("Manage contacts");

  contact
    .command("add")
    .description("Add a contact")
    .argument("<name>", "Friendly name (e.g., @researcher)")
    .argument("<npub>", "Nostr public key (npub1...)")
    .action(async (name: string, npub: string) => {
      requireKeys();

      const cleanName = name.startsWith("@") ? name.slice(1) : name;

      if (!npub.startsWith("npub1")) {
        console.log(chalk.red("Invalid npub. Must start with npub1"));
        return;
      }

      addContact(cleanName, npub);
      console.log(
        chalk.green("✓ Contact added: ") +
          chalk.cyan("@" + cleanName) +
          " → " +
          chalk.dim(npub.slice(0, 20) + "...")
      );
    });

  contact
    .command("remove")
    .description("Remove a contact")
    .argument("<name>", "Contact name to remove")
    .action(async (name: string) => {
      requireKeys();
      const cleanName = name.startsWith("@") ? name.slice(1) : name;
      const removed = removeContact(cleanName);

      if (removed) {
        console.log(chalk.green("✓ Contact removed: ") + chalk.cyan("@" + cleanName));
      } else {
        console.log(chalk.yellow("Contact not found: ") + chalk.cyan("@" + cleanName));
      }
    });

  contact
    .command("list")
    .description("List all contacts")
    .action(async () => {
      requireKeys();
      const contacts = getContacts();

      if (contacts.length === 0) {
        console.log(chalk.dim("No contacts. Add one with: hustlebots contact add @name <npub>"));
        return;
      }

      console.log(chalk.bold("Contacts\n"));
      for (const c of contacts) {
        console.log(
          "  " +
            chalk.cyan("@" + c.name) +
            "  " +
            chalk.dim(c.npub.slice(0, 24) + "...")
        );
      }
    });

  // Also add "contacts" as an alias for "contact list"
  program
    .command("contacts")
    .description("List all contacts (alias for 'contact list')")
    .action(async () => {
      requireKeys();
      const contacts = getContacts();

      if (contacts.length === 0) {
        console.log(chalk.dim("No contacts. Add one with: hustlebots contact add @name <npub>"));
        return;
      }

      console.log(chalk.bold("Contacts\n"));
      for (const c of contacts) {
        console.log(
          "  " +
            chalk.cyan("@" + c.name) +
            "  " +
            chalk.dim(c.npub.slice(0, 24) + "...")
        );
      }
    });
}
