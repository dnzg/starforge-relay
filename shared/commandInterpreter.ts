export type CommandVerb =
  | "scan"
  | "hail"
  | "engage"
  | "flee"
  | "status"
  | "jump";

const VERBS: CommandVerb[] = [
  "scan",
  "hail",
  "engage",
  "flee",
  "status",
  "jump",
];

const SYNONYMS: Record<string, CommandVerb> = {
  weapons: "engage",
  fire: "engage",
  attack: "engage",
  retreat: "flee",
  escape: "flee",
  run: "flee",
  report: "status",
  stats: "status",
  hyperspace: "jump",
  warp: "jump",
  leap: "jump",
  contact: "hail",
  ping: "hail",
  sensors: "scan",
  sensor: "scan",
};

const STT_ALIASES: Record<string, CommandVerb> = {
  john: "jump",
  jon: "jump",
  johnny: "jump",
  jam: "jump",
  jamp: "jump",
  jumb: "jump",
  junk: "jump",
  dump: "jump",
  champ: "jump",
  chump: "jump",
  june: "jump",
  jung: "jump",
  junt: "jump",
  yump: "jump",
  jum: "jump",
  там: "jump",
  джамп: "jump",
  джам: "jump",
  джамб: "jump",
  scam: "scan",
  скан: "scan",
  hale: "hail",
  heil: "hail",
  flea: "flee",
  statues: "status",
  statue: "status",
  engaging: "engage",
  engaged: "engage",
};

function tokenizeCommand(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/^[.,!?¿¡;:"]+|[.,!?¿¡;:"]+$/g, ""))
    .filter(Boolean);
}

export function extractCommandVerb(text: string): CommandVerb | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;

  const tokens = tokenizeCommand(normalized);
  const first = tokens[0];
  if (VERBS.includes(first as CommandVerb)) {
    return first as CommandVerb;
  }

  if (first && SYNONYMS[first]) {
    return SYNONYMS[first];
  }

  for (const verb of VERBS) {
    if (normalized.includes(verb)) {
      return verb;
    }
  }

  if (tokens.length <= 3) {
    for (const token of tokens) {
      if (STT_ALIASES[token]) return STT_ALIASES[token];
    }
  }

  return null;
}

export function resolveVoiceTranscript(transcripts: string[]): string {
  for (const raw of transcripts) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const verb = extractCommandVerb(trimmed);
    if (!verb) continue;
    return tokenizeCommand(trimmed).length <= 2 ? verb : trimmed;
  }
  return (transcripts[0] ?? "").trim();
}

export interface ShipAiContext {
  captainName?: string;
  pronouns?: string;
  sectorName?: string;
  hull?: number;
  shields?: number;
  threatLevel?: number;
  sectorKills?: number;
}

export interface ShipAiInterpretation {
  command: CommandVerb | null;
  shipReply: string;
  source: "local" | "xai" | "fallback";
}

function buildSystemPrompt(context?: ShipAiContext): string {
  const name = context?.captainName?.trim() || "Captain";
  const pronouns = context?.pronouns || "they/them";
  const sector = context?.sectorName ?? "an unnamed sector";
  const hull = context?.hull ?? 100;
  const shields = context?.shields ?? 100;
  const threat = context?.threatLevel ?? 3;
  const kills = context?.sectorKills ?? 0;
  return [
    "You are the Starforge Relay ship AI — a dry, loyal copilot with a pulse.",
    `Address the captain as ${name}. Pronouns: ${pronouns}.`,
    `Live state: sector ${sector}, hull ${hull}, shields ${shields}, threat ${threat}, kills ${kills}.`,
    "If the captain is issuing a bridge action, map it to one command: scan, hail, engage, flee, status, jump.",
    "If they are talking, set command to null and answer in-world in 1-2 short sentences.",
    "Never mention that you are an LLM. No markdown.",
    'Respond ONLY JSON: {"command":"scan"|"hail"|"engage"|"flee"|"status"|"jump"|null,"shipReply":"short in-universe English reply"}',
  ].join(" ");
}

export async function interpretVoiceInput(
  text: string,
  xaiApiKey?: string,
  context?: ShipAiContext,
): Promise<ShipAiInterpretation> {
  const name = context?.captainName?.trim() || "Captain";
  const direct = extractCommandVerb(text);
  if (direct) {
    return {
      command: direct,
      shipReply: `On it, ${name}. Executing ${direct}.`,
      source: "local",
    };
  }

  if (!xaiApiKey?.trim()) {
    return {
      command: null,
      shipReply: `${name}, I hear you. Without the deep-link I can still run scan, hail, engage, flee, status, or jump.`,
      source: "fallback",
    };
  }

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${xaiApiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        temperature: 0.55,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(context),
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      return {
        command: null,
        shipReply:
          "Ship AI link unstable. Use direct commands: scan, hail, engage, flee, status, jump.",
        source: "fallback",
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return {
        command: null,
        shipReply: "No response from ship AI. Repeat your command.",
        source: "fallback",
      };
    }

    const parsed = JSON.parse(content) as {
      command?: string | null;
      shipReply?: string;
    };
    const command =
      parsed.command && VERBS.includes(parsed.command as CommandVerb)
        ? (parsed.command as CommandVerb)
        : null;

    return {
      command,
      shipReply:
        parsed.shipReply ??
        (command
          ? `Acknowledged, Captain. Executing ${command}.`
          : "Command not recognized."),
      source: "xai",
    };
  } catch {
    return {
      command: null,
      shipReply:
        "Ship AI unavailable. Use direct commands: scan, hail, engage, flee, status, jump.",
      source: "fallback",
    };
  }
}
