/**
 * mcp-client.ts
 *
 * A minimal interactive CLI client for testing the blog-back MCP server over stdio.
 * Spawns the MCP server as a child process and communicates via the MCP protocol.
 *
 * Usage:
 *   npm run mcp:client
 *
 * Supported commands:
 *   list                  — list registered tools
 *   call <name>           — call a tool (you are prompted for args)
 *   resources             — list all registered resources & resource templates
 *   read <uri>            — read a resource by its exact URI
 *   help                  — show this help
 *   exit                  — quit
 *
 * NOTE: This file is intentionally excluded from git (see .gitignore).
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as readline from "readline";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function printJson(label: string, data: unknown): void {
  console.log(`\n─── ${label} ${"─".repeat(Math.max(0, 60 - label.length))}`);
  console.log(JSON.stringify(data, null, 2));
  console.log("─".repeat(64));
}

function printBanner(): void {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║          blog-back MCP Server — Test Client              ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
}

function printHelp(tools: string[]): void {
  console.log("\nAvailable commands:");
  console.log("  list              — List all registered tools");
  console.log("  call <name>       — Call a specific tool (you will be prompted for args)");
  console.log("  resources         — List all registered resources & resource templates");
  console.log("  read <uri>        — Read a resource by its exact URI");
  console.log("                      e.g. read blog://catalogue");
  console.log("                           read blog://post/6630f1e2c1234abc567890ef");
  console.log("                           read comment://blog/6630f1e2c1234abc567890ef");
  console.log("  help              — Show this help");
  console.log("  exit              — Quit\n");
  console.log(`Registered tools (${tools.length}):`);
  tools.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t}`));
  console.log();
}

// ─── Argument input loop ──────────────────────────────────────────────────────

/**
 * Prompts the user to supply call arguments in one of two ways:
 *   1. Type a raw JSON object (single line or multi-line ending with a blank line)
 *   2. Press Enter with no input to call the tool with no arguments
 */
async function collectArgs(): Promise<Record<string, unknown>> {
  console.log(
    '\nEnter arguments as a JSON object (press Enter twice to finish, or just Enter for no args).',
  );
  console.log('Example: { "cursor": null, "limit": 5 }\n');

  let raw = "";
  while (true) {
    const line = await ask("> ");
    if (line.trim() === "" && raw.trim() === "") {
      // No args — call with empty object
      return {};
    }
    if (line.trim() === "" && raw.trim() !== "") {
      // Blank line signals end of multi-line input
      break;
    }
    raw += line + "\n";
    // If it already looks like a complete JSON object, accept it immediately
    try {
      const parsed = JSON.parse(raw.trim());
      if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, unknown>;
    } catch {
      // Not complete yet — keep collecting
    }
  }

  try {
    const parsed = JSON.parse(raw.trim());
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, unknown>;
    throw new Error("Input is not a JSON object");
  } catch (e) {
    console.error(`\n[client] Invalid JSON: ${(e as Error).message}. Using empty args.\n`);
    return {};
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  printBanner();
  console.log("[client] Spawning MCP server…");

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["ts-node", "src/mcp/server.ts"],
    env: { ...process.env } as Record<string, string>,
  });

  const client = new Client(
    { name: "blog-back-test-client", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
  } catch (err) {
    console.error("[client] Failed to connect to MCP server:", err);
    process.exit(1);
  }

  console.log("[client] Connected to MCP server ✓\n");

  // ── Fetch tool list at startup ──────────────────────────────────────────────
  let toolNames: string[] = [];
  try {
    const { tools } = await client.listTools();
    toolNames = tools.map((t) => t.name);
    console.log(`[client] Server reports ${toolNames.length} tools registered.\n`);
    // Print the full tool catalogue with descriptions on first connect
    console.log("─── Tool Catalogue " + "─".repeat(45));
    tools.forEach((t) => {
      console.log(`\n  • ${t.name}`);
      if (t.description) {
        // Wrap description at 70 chars for readability
        const words = t.description.split(" ");
        let line = "    ";
        for (const word of words) {
          if (line.length + word.length + 1 > 72) {
            console.log(line);
            line = "    " + word;
          } else {
            line += (line === "    " ? "" : " ") + word;
          }
        }
        if (line.trim()) console.log(line);
      }
    });
    console.log("\n" + "─".repeat(64));
  } catch (err) {
    console.error("[client] Could not fetch tool list:", err);
  }

  // ── Fetch resource list at startup ─────────────────────────────────────────
  try {
    const { resources } = await client.listResources();
    const { resourceTemplates } = await client.listResourceTemplates();

    if (resources.length > 0 || resourceTemplates.length > 0) {
      console.log("─── Resource Catalogue " + "─".repeat(41));
      resources.forEach((r) => {
        console.log(`\n  [static]   ${r.uri}`);
        if (r.name) console.log(`             ${r.name}`);
      });
      resourceTemplates.forEach((rt) => {
        console.log(`\n  [template] ${rt.uriTemplate}`);
        if (rt.name) console.log(`             ${rt.name}`);
      });
      console.log("\n" + "─".repeat(64));
    }
  } catch (err) {
    console.error("[client] Could not fetch resource list:", err);
  }

  // ─── REPL ───────────────────────────────────────────────────────────────────
  printHelp(toolNames);

  while (true) {
    const input = (await ask("mcp> ")).trim();

    if (!input) continue;

    const [cmd, ...rest] = input.split(/\s+/);

    switch (cmd.toLowerCase()) {
      // ── list ────────────────────────────────────────────────────────────────
      case "list": {
        try {
          const { tools } = await client.listTools();
          toolNames = tools.map((t) => t.name);
          printHelp(toolNames);
        } catch (err) {
          console.error("[client] listTools error:", err);
        }
        break;
      }

      // ── call <toolName> ─────────────────────────────────────────────────────
      case "call": {
        const toolName = rest.join(" ").trim();

        if (!toolName) {
          console.log('\n[client] Usage: call <tool-name>  (e.g. "call get-all-blogs")\n');
          break;
        }

        if (!toolNames.includes(toolName)) {
          console.log(`\n[client] Unknown tool "${toolName}". Type "list" to see all tools.\n`);
          break;
        }

        // Show the tool's input schema so the user knows what to provide
        try {
          const { tools } = await client.listTools();
          const def = tools.find((t) => t.name === toolName);
          if (def?.inputSchema) {
            printJson(`Input schema for "${toolName}"`, def.inputSchema);
          }
        } catch {
          // Non-fatal — schema preview is best-effort
        }

        const args = await collectArgs();
        console.log(`\n[client] Calling "${toolName}" with args:`, JSON.stringify(args));

        try {
          const result = await client.callTool({ name: toolName, arguments: args });
          printJson(`Result: ${toolName}`, result);
        } catch (err) {
          console.error(`\n[client] Tool call error for "${toolName}":`, err);
        }
        break;
      }

      // ── resources ───────────────────────────────────────────────────────────
      case "resources": {
        try {
          const { resources } = await client.listResources();
          const { resourceTemplates } = await client.listResourceTemplates();

          console.log("\n─── Static Resources " + "─".repeat(43));
          if (resources.length === 0) {
            console.log("  (none)");
          } else {
            resources.forEach((r, i) => {
              console.log(`  ${String(i + 1).padStart(2)}. ${r.uri}`);
              if (r.name) console.log(`      Name:        ${r.name}`);
              if (r.description) console.log(`      Description: ${r.description}`);
            });
          }

          console.log("\n─── Resource Templates " + "─".repeat(41));
          if (resourceTemplates.length === 0) {
            console.log("  (none)");
          } else {
            resourceTemplates.forEach((rt, i) => {
              console.log(`  ${String(i + 1).padStart(2)}. ${rt.uriTemplate}`);
              if (rt.name) console.log(`      Name:        ${rt.name}`);
              if (rt.description) console.log(`      Description: ${rt.description}`);
            });
          }
          console.log("\n" + "─".repeat(64));
        } catch (err) {
          console.error("[client] listResources error:", err);
        }
        break;
      }

      // ── read <uri> ──────────────────────────────────────────────────────────
      case "read": {
        const uri = rest.join(" ").trim();

        if (!uri) {
          console.log('\n[client] Usage: read <uri>  (e.g. "read blog://catalogue")\n');
          break;
        }

        console.log(`\n[client] Reading resource: ${uri}`);

        try {
          const result = await client.readResource({ uri });
          printJson(`Resource: ${uri}`, result);
        } catch (err) {
          console.error(`\n[client] Resource read error for "${uri}":`, err);
        }
        break;
      }

      // ── help ─────────────────────────────────────────────────────────────────
      case "help": {
        printHelp(toolNames);
        break;
      }

      // ── exit / quit ──────────────────────────────────────────────────────────
      case "exit":
      case "quit": {
        console.log("\n[client] Closing connection…");
        try {
          await client.close();
        } catch {
          // Ignore close errors
        }
        rl.close();
        process.exit(0);
      }

      default: {
        console.log(`\n[client] Unknown command "${cmd}". Type "help" for usage.\n`);
      }
    }
  }
}

main().catch((err) => {
  console.error("[client] Fatal error:", err);
  process.exit(1);
});
