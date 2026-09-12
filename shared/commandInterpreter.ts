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

export function extractCommandVerb(text: string): CommandVerb | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;

  const first = normalized.split(/\s+/)[0]?.replace(/[.,!?]/g, "");
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

  return null;
}

export interface ShipAiInterpretation {
  command: CommandVerb | null;
  shipReply: string;
  source: "local" | "xai" | "fallback";
}

export async function interpretVoiceInput(
  text: string,
  xaiApiKey?: string,
): Promise<ShipAiInterpretation> {
  const direct = extractCommandVerb(text);
  if (direct) {
    return {
      command: direct,
      shipReply: `Acknowledged, Captain. Executing ${direct}.`,
      source: "local",
    };
  }

  if (!xaiApiKey?.trim()) {
    return {
      command: null,
      shipReply:
        "Command unclear. Say or type: scan, hail, engage, flee, status, jump.",
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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are Starforge Relay ship AI. Map captain speech to one bridge command when possible: scan, hail, engage, flee, status, jump. Respond ONLY JSON: {"command":"scan"|"hail"|"engage"|"flee"|"status"|"jump"|null,"shipReply":"short in-universe English reply"}',
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
