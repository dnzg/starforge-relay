import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  parseCommand,
  resolveCommand,
  sectorNameFromSeed,
  type RunSnapshot,
} from "./commandResolver";

function defaultRunSnapshot(
  seed: number,
  overrides?: Partial<RunSnapshot>,
): RunSnapshot {
  return {
    status: "active",
    sectorSeed: seed,
    sectorName: sectorNameFromSeed(seed),
    hull: 100,
    shields: 100,
    fuel: 100,
    credits: 50,
    threatLevel: 3,
    hyperspaceActive: false,
    jumpsCompleted: 0,
    ...overrides,
  };
}

export const startRun = mutation({
  args: {
    displayName: v.string(),
    telegramId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let playerId = null as null | Awaited<ReturnType<typeof ctx.db.insert>>;

    if (args.telegramId) {
      const existing = await ctx.db
        .query("players")
        .withIndex("by_telegram", (q) => q.eq("telegramId", args.telegramId))
        .first();
      if (existing) {
        playerId = existing._id;
      }
    }

    if (!playerId) {
      playerId = await ctx.db.insert("players", {
        telegramId: args.telegramId,
        displayName: args.displayName,
        createdAt: Date.now(),
      });
    }

    const seed = Math.floor(Math.random() * 1_000_000);
    const snapshot = defaultRunSnapshot(seed);
    const now = Date.now();

    const runId = await ctx.db.insert("runs", {
      playerId,
      ...snapshot,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("sectors", {
      runId,
      seed,
      name: snapshot.sectorName,
      threatLevel: snapshot.threatLevel,
      generatedAt: now,
    });

    await ctx.db.insert("commandLogs", {
      runId,
      command: "boot",
      source: "text",
      response:
        "Starforge Relay online. Voice or text commands ready: scan, hail, engage, flee, status, jump.",
      timestamp: now,
    });

    return runId;
  },
});

export const sendCommand = mutation({
  args: {
    runId: v.id("runs"),
    command: v.string(),
    source: v.union(v.literal("text"), v.literal("voice")),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      throw new Error("Run not found");
    }
    if (run.status !== "active") {
      return {
        response: `Run ${run.status}. Start a new voyage from the bridge.`,
        runId: args.runId,
      };
    }

    const verb = parseCommand(args.command);
    if (!verb) {
      const response =
        "Unknown command. Available: scan, hail, engage, flee, status, jump.";
      await ctx.db.insert("commandLogs", {
        runId: args.runId,
        command: args.command,
        source: args.source,
        response,
        timestamp: Date.now(),
      });
      return { response, runId: args.runId };
    }

    const snapshot: RunSnapshot = {
      status: run.status,
      sectorSeed: run.sectorSeed,
      sectorName: run.sectorName,
      hull: run.hull,
      shields: run.shields,
      fuel: run.fuel,
      credits: run.credits,
      threatLevel: run.threatLevel,
      scanData: run.scanData,
      planetTextureUrl: run.planetTextureUrl,
      hyperspaceActive: run.hyperspaceActive,
      lastCommand: run.lastCommand,
      jumpsCompleted: run.jumpsCompleted,
    };

    const result = resolveCommand(verb, snapshot);
    const now = Date.now();

    await ctx.db.patch(args.runId, {
      ...result.run,
      hyperspaceActive: result.run.hyperspaceActive ?? false,
      updatedAt: now,
    });

    if (verb === "jump" && result.hyperspaceTrigger) {
      await ctx.db.insert("sectors", {
        runId: args.runId,
        seed: result.run.sectorSeed ?? run.sectorSeed,
        name: result.run.sectorName ?? run.sectorName,
        threatLevel: result.run.threatLevel ?? run.threatLevel,
        planetTextureUrl: result.run.planetTextureUrl,
        generatedAt: now,
      });
    }

    await ctx.db.insert("commandLogs", {
      runId: args.runId,
      command: args.command,
      source: args.source,
      response: result.response,
      timestamp: now,
    });

    if (result.run.status && result.run.status !== "active") {
      const player = await ctx.db.get(run.playerId);
      const score =
        run.jumpsCompleted * 100 +
        run.credits +
        (result.run.status === "fled" ? 50 : 0);

      await ctx.db.insert("leaderboard", {
        playerId: run.playerId,
        displayName: player?.displayName ?? "Captain",
        score,
        sectorReached: run.jumpsCompleted + 1,
        runId: args.runId,
        completedAt: now,
      });
    }

    return {
      response: result.response,
      runId: args.runId,
      hyperspaceTrigger: result.hyperspaceTrigger ?? false,
    };
  },
});

export const getRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;

    const logs = await ctx.db
      .query("commandLogs")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .order("desc")
      .take(20);

    return { run, logs: logs.reverse() };
  },
});

export const getLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_score")
      .order("desc")
      .take(limit);
    return entries;
  },
});
