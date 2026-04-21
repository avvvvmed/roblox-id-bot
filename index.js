import express from "express";
import { Client, GatewayIntentBits, Events, Partials } from "discord.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN env var is required");
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;
const app = express();
app.get("/", (_req, res) => res.send("Roblox ID Bot is running"));
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.listen(port, () => console.log(`HTTP server listening on ${port}`));

async function lookupRobloxUser(username) {
  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });
  if (!res.ok) throw new Error(`Roblox API ${res.status}`);
  const json = await res.json();
  return json.data[0] ?? null;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  const content = message.content.trim();
  if (!content.toLowerCase().startsWith("!id")) return;

  const username = content.split(/\s+/).slice(1).join(" ").trim();
  if (!username) {
    await message.reply("Usage: `!ID [roblox-username]`");
    return;
  }
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    await message.reply(
      "That doesn't look like a valid Roblox username (3-20 characters, letters, numbers, and underscores).",
    );
    return;
  }

  try {
    const user = await lookupRobloxUser(username);
    if (!user) {
      await message.reply(`No Roblox user found with the username \`${username}\`.`);
      return;
    }
    await message.reply(
      `**${user.displayName}** (\`${user.name}\`)\nRoblox ID: \`${user.id}\`\nProfile: https://www.roblox.com/users/${user.id}/profile`,
    );
  } catch (err) {
    console.error("Roblox lookup failed:", err);
    await message.reply("Couldn't reach the Roblox API right now. Please try again in a moment.");
  }
});

client.login(token).catch((err) => {
  console.error("Failed to log in:", err);
  process.exit(1);
});
