import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { StarsSku } from "../shared/starsCatalog.js";
import { STARS_SKUS } from "../shared/starsCatalog.js";

export interface UserEntitlements {
  livery_reroll: number;
  demo_boost: boolean;
  chargeIds: string[];
}

interface EntitlementsFile {
  users: Record<string, UserEntitlements>;
}

const DEFAULT_USER: UserEntitlements = {
  livery_reroll: 0,
  demo_boost: false,
  chargeIds: [],
};

export class StarsEntitlementsStore {
  private readonly filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async readFile(): Promise<EntitlementsFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as EntitlementsFile;
      if (!parsed.users || typeof parsed.users !== "object") {
        return { users: {} };
      }
      return parsed;
    } catch {
      return { users: {} };
    }
  }

  private async writeFile(data: EntitlementsFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(task, task);
    this.writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async get(userId: string): Promise<UserEntitlements> {
    const data = await this.readFile();
    const user = data.users[userId];
    if (!user) return { ...DEFAULT_USER };
    return {
      livery_reroll: user.livery_reroll ?? 0,
      demo_boost: Boolean(user.demo_boost),
      chargeIds: Array.isArray(user.chargeIds) ? [...user.chargeIds] : [],
    };
  }

  async grantFromSku(
    userId: string,
    sku: StarsSku,
    chargeId: string,
  ): Promise<UserEntitlements> {
    return this.enqueue(async () => {
      const data = await this.readFile();
      const current = data.users[userId] ?? { ...DEFAULT_USER };
      if (current.chargeIds.includes(chargeId)) {
        return {
          livery_reroll: current.livery_reroll ?? 0,
          demo_boost: Boolean(current.demo_boost),
          chargeIds: current.chargeIds,
        };
      }

      const grant = STARS_SKUS[sku].grant;
      const next: UserEntitlements = {
        livery_reroll:
          (current.livery_reroll ?? 0) + (grant.livery_reroll ?? 0),
        demo_boost: grant.demo_boost ? true : Boolean(current.demo_boost),
        chargeIds: [...current.chargeIds, chargeId],
      };
      data.users[userId] = next;
      await this.writeFile(data);
      return next;
    });
  }

  async mockGrant(userId: string, sku: StarsSku): Promise<UserEntitlements> {
    const chargeId = `mock:${sku}:${Date.now()}`;
    return this.grantFromSku(userId, sku, chargeId);
  }

  async consumeLiveryCredit(userId: string): Promise<boolean> {
    return this.enqueue(async () => {
      const data = await this.readFile();
      const current = data.users[userId];
      if (!current || (current.livery_reroll ?? 0) < 1) return false;
      data.users[userId] = {
        ...current,
        livery_reroll: current.livery_reroll - 1,
      };
      await this.writeFile(data);
      return true;
    });
  }
}
