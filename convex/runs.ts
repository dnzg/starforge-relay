import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  hashSeed,
  nextSectorSeed,
  parseCommand,
  resolveCommand,
  sectorNameFromSeed,
  type RunSnapshot,
} from "./commandResolver";

function computeLeaderboardScore(run: Doc<"runs">): number {
  return (
    run.arcadeScore +
    run.jumpsCompleted * 100 +
    run.credits +
    run.sectorKills * 25
  );
}

async function recordLeaderboardEntry(
  ctx: MutationCtx,
  run: Doc<"runs">,
  runId: Id<"runs">,
) {
  const player = await ctx.db.get(run.playerId);
  await ctx.db.insert("leaderboard", {
    playerId: run.playerId,
    displayName: player?.displayName ?? "Captain",
    score: computeLeaderboardScore(run),
    sectorReached: run.jumpsCompleted + 1,
    runId,
    completedAt: Date.now(),
  });
}

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
    arcadeScore: 0,
    sectorKills: 0,
    ...overrides,
  };
}

export const startRun = mutation({
  args: {
    displayName: v.string(),
    telegramId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let playerId: Id<"players"> | null = null;

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
      arcadeScore: run.arcadeScore,
      sectorKills: run.sectorKills,
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
      const updated = await ctx.db.get(args.runId);
      if (updated) {
        await recordLeaderboardEntry(ctx, updated, args.runId);
      }
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

export const appendShipMessage = mutation({
  args: {
    runId: v.id("runs"),
    heardText: v.string(),
    shipReply: v.string(),
    source: v.union(v.literal("text"), v.literal("voice")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("commandLogs", {
      runId: args.runId,
      command: args.heardText,
      source: args.source,
      response: args.shipReply,
      speaker: "ship",
      timestamp: Date.now(),
    });
  },
});

export const setPlanetTextureUrl = mutation({
  args: {
    runId: v.id("runs"),
    planetTextureUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "active") return;
    await ctx.db.patch(args.runId, {
      planetTextureUrl: args.planetTextureUrl,
      updatedAt: Date.now(),
    });
  },
});

export const applyCombatDamage = mutation({
  args: {
    runId: v.id("runs"),
    damage: v.number(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "active") return { ended: false };

    let shields = run.shields;
    let hull = run.hull;
    let remaining = args.damage;
    if (shields > 0) {
      const absorbed = Math.min(shields, remaining);
      shields -= absorbed;
      remaining -= absorbed;
    }
    hull = Math.max(0, hull - remaining);
    const now = Date.now();

    if (hull <= 0) {
      await ctx.db.patch(args.runId, {
        shields: 0,
        hull: 0,
        status: "ended",
        updatedAt: now,
      });
      const updated = await ctx.db.get(args.runId);
      if (updated) {
        await recordLeaderboardEntry(ctx, updated, args.runId);
      }
      return { ended: true };
    }

    await ctx.db.patch(args.runId, {
      shields,
      hull,
      updatedAt: now,
    });
    return { ended: false };
  },
});

export const awardCombatKill = mutation({
  args: {
    runId: v.id("runs"),
    credits: v.number(),
    scoreDelta: v.number(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "active") return;

    await ctx.db.patch(args.runId, {
      credits: run.credits + args.credits,
      threatLevel: Math.max(1, run.threatLevel - 1),
      arcadeScore: run.arcadeScore + args.scoreDelta,
      sectorKills: run.sectorKills + 1,
      updatedAt: Date.now(),
    });
  },
});

export const performSectorJump = mutation({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "active" || run.fuel < 20) {
      return { hyperspaceTrigger: false };
    }

    const newSeed = nextSectorSeed(run.sectorSeed, run.jumpsCompleted);
    const newName = sectorNameFromSeed(newSeed);
    const newThreat = (hashSeed(newSeed) % 8) + 2;
    const now = Date.now();

    await ctx.db.patch(args.runId, {
      fuel: run.fuel - 20,
      sectorSeed: newSeed,
      sectorName: newName,
      threatLevel: newThreat,
      scanData: undefined,
      planetTextureUrl: undefined,
      jumpsCompleted: run.jumpsCompleted + 1,
      sectorKills: 0,
      hyperspaceActive: true,
      updatedAt: now,
    });

    await ctx.db.insert("sectors", {
      runId: args.runId,
      seed: newSeed,
      name: newName,
      threatLevel: newThreat,
      generatedAt: now,
    });

    return {
      hyperspaceTrigger: true,
      response: `Hyperspace jump complete. Arrived at ${newName}.`,
    };
  },
});
