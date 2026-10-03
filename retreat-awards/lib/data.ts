export const NOMINEES = [
  "Dan",
  "Hugh",
  "Hannah",
  "Daniah",
  "Russell",
  "Ruth",
  "Samar",
  "Aditi",
] as const;

export type Award = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
};

export const AWARDS: Award[] = [
  {
    id: "sartorial-standard",
    emoji: "👔",
    title: "The Sartorial Standard",
    subtitle: "The Best Dressed Award",
    description:
      "For the person whose office or video-call attire makes everyone else wonder if there is an unscheduled board meeting. Always tailored, effortlessly polished, and immune to the temptation of casual dress-down days.",
  },
  {
    id: "eagle-eye",
    emoji: "🔍",
    title: "The Eagle Eye",
    subtitle: "The Redline Maestro",
    description:
      "Awarded to the colleague who catches stray punctuation, rogue double spaces, mismatched cross-references, and formatting crimes before anyone else even finishes reading recital A.",
  },
  {
    id: "force-majeure",
    emoji: "⚡",
    title: "The Force Majeure",
    subtitle: "The Crisis Tamer",
    description:
      "For the teammate who stays calm and completely unflappable when unprecedented chaos hits, tight turnarounds collapse, and five urgent 'drop everything' contract approvals land simultaneously at 4:55 PM on a Friday.",
  },
  {
    id: "boilerplate-gourmet",
    emoji: "🥐",
    title: "The Boilerplate Gourmet",
    subtitle: "The Snack & Treat Champion",
    description:
      "Awarded to the person whose desk is effectively an auxiliary pantry, who always knows the best coffee spots nearby, or who reliably supplies the team retreat with top-tier sustenance.",
  },
  {
    id: "master-negotiator",
    emoji: "🤝",
    title: "The Master Negotiator",
    subtitle: "The Diplomat",
    description:
      "For the colleague who could talk an aggressive counterpart out of an uncapped liability clause with pure charm, gentle persuasion, and a smile—leaving the other side thanking them for the privilege.",
  },
  {
    id: "version-final",
    emoji: "📂",
    title: "Version_Final_v12_ACTUAL_FINAL",
    subtitle: "The Document Juggler",
    description:
      "Dedicated to the person managing endless iterations, tracking 40 redlines across six internal stakeholders, and somehow still knowing precisely which draft is the one meant for execution.",
  },
  {
    id: "human-wikipedia",
    emoji: "📚",
    title: "The Human Wikipedia",
    subtitle: "The Walking Precedent",
    description:
      "For the team member who remembers that obscure clause from an agreement signed three years ago, exactly where that template is filed, or which stakeholder needs to sign off on specific deviations.",
  },
  {
    id: "zen-master",
    emoji: "🧘",
    title: "The In-House Zen Master",
    subtitle: "The Vibe Anchor",
    description:
      "For the person who radiates peaceful energy, brings thoughtful perspective during stressful quarters, and reminds everyone to take a breath when commercial teams demand immediate turnarounds.",
  },
  {
    id: "swift-sign-off",
    emoji: "⚡",
    title: "The Swift Sign-Off",
    subtitle: "The Velocity Champion",
    description:
      "Awarded to the fastest turnaround artist on the team—the one whose inbox is always clean, whose approvals land before the request notification even fades, and who keeps deals moving forward effortlessly.",
  },
  {
    id: "subject-to-contract",
    emoji: "📝",
    title: "The 'Subject to Contract' Award",
    subtitle: "The Non-Committal Legend",
    description:
      "For the colleague who qualifies every daily life decision just in case: 'I will probably grab lunch at 1:00 PM, without prejudice, subject to availability and calendar conditions.'",
  },
];

/** Canonical key for a voter so "aditi", " Aditi " etc. map to one ballot. */
export function voterKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Returns the roster spelling for a name, or the trimmed input for guests. */
export function canonicalName(name: string): string {
  const key = voterKey(name);
  return NOMINEES.find((n) => n.toLowerCase() === key) ?? name.trim().replace(/\s+/g, " ");
}

export type Ballot = {
  voter: string;
  votes: Record<string, string>;
  submittedAt: string;
};

export type AwardResult = {
  awardId: string;
  totalVotes: number;
  tally: { name: string; count: number }[];
  winners: string[];
  topCount: number;
};

export type ResultsPayload = {
  epoch: string;
  rosterSize: number;
  rosterVoted: string[];
  guestVoters: string[];
  ballotsCast: number;
  lastVoteAt: string | null;
  awards: AwardResult[];
};
