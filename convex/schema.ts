import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    telegramId: v.optional(v.string()),
    displayName: v.string(),
    createdAt: v.number(),
  }).index("by_telegram", ["telegramId"]),

  runs: defineTable({
    playerId: v.id("players"),
    status: v.union(
      v.literal("active"),
      v.literal("ended"),
      v.literal("fled"),
    ),
    sectorSeed: v.number(),
    sectorName: v.string(),
    hull: v.number(),
    shields: v.number(),
    fuel: v.number(),
    credits: v.number(),
    threatLevel: v.number(),
    scanData: v.optional(v.string()),
    planetTextureUrl: v.optional(v.string()),
    hyperspaceActive: v.boolean(),
    lastCommand: v.optional(v.string()),
    jumpsCompleted: v.number(),
    arcadeScore: v.number(),
    sectorKills: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_player", ["playerId"])
    .index("by_status", ["status"]),

  sectors: defineTable({
    runId: v.id("runs"),
    seed: v.number(),
    name: v.string(),
    threatLevel: v.number(),
    planetTextureUrl: v.optional(v.string()),
    generatedAt: v.number(),
  }).index("by_run", ["runId"]),

  commandLogs: defineTable({
    runId: v.id("runs"),
    command: v.string(),
    source: v.union(v.literal("text"), v.literal("voice")),
    response: v.string(),
    speaker: v.optional(
      v.union(v.literal("captain"), v.literal("ship"), v.literal("system")),
    ),
    timestamp: v.number(),
  }).index("by_run", ["runId"]),

  leaderboard: defineTable({
    playerId: v.id("players"),
    displayName: v.string(),
    score: v.number(),
    sectorReached: v.number(),
    runId: v.id("runs"),
    completedAt: v.number(),
  }).index("by_score", ["score"]),
});
