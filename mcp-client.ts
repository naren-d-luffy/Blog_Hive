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
 *   prompts               — list all registered prompt templates
 *   prompt <name>         — fetch and render a prompt
 *   auth <user|admin> [id]— mint and activate a test JWT token
 *   token <jwt|clear>     — set or clear an access token
 *   whoami                — display current active user identity
 *   help                  — show this help
 *   exit                  — quit
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import * as readline from "readline";
import { generateMcpAccessToken } from "./src/mcp/security/mcp.security.token";
import { verifyAccessToken } from "./src/auth/auth.core";
import { Role } from "./src/types/auth.types";
import { mcpConfig } from "./src/config/mcp/mcp.config";
import env from "./src/config/env.config";

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

function printHelp(tools: string[], prompts: string[] = []): void {
  console.log("\nAvailable commands:");
  console.log("  list              — List all registered tools");
  console.log("  call <name>       — Call a specific tool (you will be prompted for args)");
  console.log("  resources         — List all registered resources & resource templates");
  console.log("  read <uri>        — Read a resource by its exact URI");
  console.log("                      e.g. read blog://catalogue");
  console.log("                           read blog://post/6630f1e2c1234abc567890ef");
  console.log("                           read comment://blog/6630f1e2c1234abc567890ef");
  console.log("  prompts           — List all registered prompt templates");
  console.log("  prompt <name>     — Fetch and render a prompt template with arguments");
  console.log("                      e.g. prompt summarize-blog");
  console.log("                           prompt draft-blog-post");
  console.log("  auth <role> [id]  — Mint & activate a test token (role: 'user' | 'admin')");
  console.log("  token <jwt|clear> — Set custom JWT or clear current token");
  console.log("  whoami            — Display currently active authenticated identity");
  console.log("  help              — Show this help");
  console.log("  exit              — Quit\n");
  console.log(`Registered tools (${tools.length}):`);
  tools.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t}`));
  if (prompts.length > 0) {
    console.log(`\nRegistered prompts (${prompts.length}):`);
    prompts.forEach((p, i) => console.log(`  ${String(i + 1).padStart(2)}. ${p}`));
  }
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

  // Active authentication state for client session
  let activeToken: string | null = process.env.MCP_ACCESS_TOKEN ?? null;
  if (activeToken) {
    try {
      const decoded = verifyAccessToken(activeToken);
      console.log(`[client] Using environment token as ${decoded.role} (${decoded.id})\n`);
    } catch {
      console.log("[client] Notice: Environment token is invalid or expired.\n");
      activeToken = null;
    }
  }

  const useStdio = process.argv.includes("--stdio") || env.MCP_TRANSPORT === "stdio";
  const serverUrl =`http://${mcpConfig.http.host}:${mcpConfig.http.port}${mcpConfig.http.endpoint}`;

  let transport: StdioClientTransport | StreamableHTTPClientTransport;

  if (useStdio) {
    console.log("[client] Connecting to MCP server via STDIO child process…");
    const isWindows = process.platform === "win32";
    transport = new StdioClientTransport({
      command: isWindows ? "npx.cmd" : "npx",
      args: ["ts-node", "src/mcp/server.ts"],
      env: { ...process.env, MCP_TRANSPORT: "stdio" } as Record<string, string>,
    });
  } else {
    console.log(`[client] Connecting to MCP Streamable HTTP server at ${serverUrl}…`);
    transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
      requestInit: {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      },
    });
  }

  const client = new Client(
    { name: "blog-back-test-client", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
  } catch (err: any) {
    console.error("[client] Failed to connect to MCP server:", err?.message || err);
    if (!useStdio) {
      console.error(
        `[client] Ensure the MCP server is running first ("npm run mcp:start") or test via STDIO ("npm run mcp:client -- --stdio").`,
      );
    }
    process.exit(1);
  }

  const sessionId = "sessionId" in transport ? (transport as any).sessionId : undefined;
  console.log(
    `[client] Connected to MCP server ✓ ${sessionId ? `(Session ID: ${sessionId})` : ""}\n`,
  );

  // ── Fetch tool list at startup ──────────────────────────────────────────────
  let toolNames: string[] = [];
  try {
    const { tools } = await client.listTools();
    toolNames = tools.map((t) => t.name);
    console.log(`[client] Server reports ${toolNames.length} tools registered.\n`);
    console.log("─── Tool Catalogue " + "─".repeat(45));
    tools.forEach((t) => {
      console.log(`\n  • ${t.name}`);
      if (t.description) {
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

  // ── Fetch prompt list at startup ───────────────────────────────────────────
  let promptNames: string[] = [];
  try {
    const { prompts } = await client.listPrompts();
    promptNames = prompts.map((p) => p.name);

    if (prompts.length > 0) {
      console.log("─── Prompt Catalogue " + "─".repeat(43));
      prompts.forEach((p) => {
        console.log(`\n  • ${p.name}`);
        if (p.description) {
          console.log(`    ${p.description}`);
        }
        if (p.arguments && p.arguments.length > 0) {
          console.log(
            `    Arguments: ${p.arguments.map((a) => `${a.name}${a.required ? " (required)" : ""}`).join(", ")}`,
          );
        }
      });
      console.log("\n" + "─".repeat(64));
    }
  } catch (err) {
    console.error("[client] Could not fetch prompt list:", err);
  }

  // ─── REPL ───────────────────────────────────────────────────────────────────
  printHelp(toolNames, promptNames);

  while (true) {
    const input = (await ask("mcp> ")).trim();

    if (!input) continue;

    const [cmd, ...rest] = input.split(/\s+/);

    switch (cmd.toLowerCase()) {
      // ── auth <role> [id] ────────────────────────────────────────────────────
      case "auth":
      case "login": {
        const roleArg = (rest[0] || "user").toLowerCase();
        if (roleArg !== "user" && roleArg !== "admin") {
          console.log('\n[client] Invalid role. Usage: auth <user|admin> [mongoId]\n');
          break;
        }

        const idArg = rest[1] || "6630f1e2c1234abc567890ef";
        try {
          activeToken = generateMcpAccessToken({ id: idArg, role: roleArg as Role });
          console.log(`\n[client] Activated test token for role="${roleArg}", userId="${idArg}".`);
          console.log(`[client] Token: ${activeToken.slice(0, 20)}…\n`);
        } catch (e: any) {
          console.error(`\n[client] Error generating token: ${e.message}\n`);
        }
        break;
      }

      // ── token <jwt|clear> ───────────────────────────────────────────────────
      case "token": {
        const tokenArg = rest.join(" ").trim();
        if (!tokenArg) {
          console.log(`\n[client] Current token: ${activeToken ?? "(none - anonymous)"}\n`);
          break;
        }

        if (tokenArg.toLowerCase() === "clear") {
          activeToken = null;
          console.log("\n[client] Cleared active access token.\n");
          break;
        }

        try {
          const decoded = verifyAccessToken(tokenArg);
          activeToken = tokenArg;
          console.log(`\n[client] Token set successfully! Verified as ${decoded.role} (${decoded.id})\n`);
        } catch {
          activeToken = tokenArg;
          console.log(`\n[client] Custom token activated (Will be verified by MCP server via Google OAuth / Bearer handler).\n`);
        }
        break;
      }

      // ── whoami ──────────────────────────────────────────────────────────────
      case "whoami": {
        if (!activeToken) {
          console.log('\n[client] Anonymous (no token active). Use "auth user" or "auth admin" to authenticate.\n');
        } else {
          try {
            const user = verifyAccessToken(activeToken);
            console.log(`\n[client] Authenticated user:`);
            console.log(`  ID:   ${user.id}`);
            console.log(`  Role: ${user.role}\n`);
          } catch {
            console.log(`\n[client] Active token is a custom/Google OAuth token. Server validates it per request.\n`);
          }
        }
        break;
      }

      // ── list ────────────────────────────────────────────────────────────────
      case "list": {
        try {
          const { tools } = await client.listTools();
          toolNames = tools.map((t) => t.name);
          printHelp(toolNames, promptNames);
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
        if (activeToken) {
          console.log(`[client] Attaching authorization token from active session.`);
        }

        try {
          const result = await client.callTool({
            name: toolName,
            arguments: args,
            _meta: activeToken ? { token: activeToken } : undefined,
          });
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
          const result = await client.readResource({
            uri,
            _meta: activeToken ? { token: activeToken } : undefined,
          } as any);
          printJson(`Resource: ${uri}`, result);
        } catch (err) {
          console.error(`\n[client] Resource read error for "${uri}":`, err);
        }
        break;
      }

      // ── prompts ─────────────────────────────────────────────────────────────
      case "prompts": {
        try {
          const { prompts } = await client.listPrompts();
          promptNames = prompts.map((p) => p.name);

          console.log("\n─── Registered Prompts " + "─".repeat(41));
          if (prompts.length === 0) {
            console.log("  (none)");
          } else {
            prompts.forEach((p, i) => {
              console.log(`\n  ${String(i + 1).padStart(2)}. ${p.name}`);
              if (p.description) console.log(`      Description: ${p.description}`);
              if (p.arguments && p.arguments.length > 0) {
                console.log("      Arguments:");
                p.arguments.forEach((arg) => {
                  console.log(
                    `        - ${arg.name}${arg.required ? " (required)" : ""}: ${arg.description ?? ""}`,
                  );
                });
              }
            });
          }
          console.log("\n" + "─".repeat(64));
        } catch (err) {
          console.error("[client] listPrompts error:", err);
        }
        break;
      }

      // ── prompt <name> ───────────────────────────────────────────────────────
      case "prompt": {
        const promptName = rest.join(" ").trim();

        if (!promptName) {
          console.log('\n[client] Usage: prompt <name>  (e.g. "prompt summarize-blog")\n');
          break;
        }

        try {
          const { prompts } = await client.listPrompts();
          promptNames = prompts.map((p) => p.name);
          const def = prompts.find((p) => p.name === promptName);

          if (!def) {
            console.log(
              `\n[client] Unknown prompt "${promptName}". Type "prompts" to see available prompts.\n`,
            );
            break;
          }

          let args: Record<string, string> = {};
          if (def.arguments && def.arguments.length > 0) {
            console.log(`\nPrompt "${promptName}" accepts arguments:`);
            def.arguments.forEach((a) => {
              console.log(`  • ${a.name}${a.required ? " (required)" : ""}: ${a.description ?? ""}`);
            });
            const collected = await collectArgs();
            args = collected as Record<string, string>;
          }

          console.log(`\n[client] Fetching prompt "${promptName}" with args:`, JSON.stringify(args));
          const result = await client.getPrompt({
            name: promptName,
            arguments: args,
            _meta: activeToken ? { token: activeToken } : undefined,
          } as any);
          printJson(`Prompt: ${promptName}`, result);
        } catch (err) {
          console.error(`\n[client] Get prompt error for "${promptName}":`, err);
        }
        break;
      }

      // ── help ─────────────────────────────────────────────────────────────────
      case "help": {
        printHelp(toolNames, promptNames);
        break;
      }

      // ── exit / quit ──────────────────────────────────────────────────────────
      case "exit":
      case "quit": {
        console.log("\n[client] Closing connection…");
        try {
          if ("terminateSession" in transport && typeof (transport as any).terminateSession === "function") {
            await (transport as any).terminateSession();
          }
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
