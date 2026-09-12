/* eslint-disable */
/**
 * Generated data model types.
 * Run `npx convex dev` to regenerate.
 */
import type { DataModelFromSchemaDefinition } from "convex/server";
import type schema from "../schema";

export type DataModel = DataModelFromSchemaDefinition<typeof schema>;

export type Id<TableName extends keyof DataModel> =
  DataModel[TableName]["document"]["_id"];

export type Doc<TableName extends keyof DataModel> =
  DataModel[TableName]["document"];
