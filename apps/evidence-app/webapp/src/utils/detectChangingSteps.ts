// The verb groups a step can fall into. Kept as a union rather than a bare
// string so a typo in a call site is a compile error, not a silent no-match.
export type ChangingVerbGroup = "deletion" | "update" | "rename" | "creation" | "access change";

type ChangingVerbGroupRow = {
  group: ChangingVerbGroup;
  // Present tense stems. Their other forms are generated below, so a row
  // never has to list "deletes", "deleted" and "deleting" by hand.
  stems: string[];
};

// One row per group of changing verbs the Agent Runner should pause on.
//
// These are matched ANYWHERE in a step, not only as its first word — see
// chala2001/grc-tools#136. An earlier version read the leading verb only, on
// the reasoning that "screenshot the delete protection setting" is an
// ordinary Evidence prompt and should stay silent. That reasoning holds if
// the warning BLOCKS. It does not: the warning is a banner and a tick box,
// and the Engineer always gets through. So a false positive costs one tick
// and a miss costs a deleted resource, which is a lopsided enough trade that
// matching everywhere is the safer rule. It is also a rule an Engineer can
// predict without reading this file, which is worth a great deal on its own.
//
// Matching everywhere is what makes the awkward phrasings work: "1.delete"
// with no space after the marker, "find the key vault and delete", "please
// delete the account", "deleting the account". Each of those slipped past
// the leading word rule.
const CHANGING_VERB_GROUPS: ChangingVerbGroupRow[] = [
  {
    group: "deletion",
    // Outright destruction. Rarer synonyms ("erase", "wipe", "purge",
    // "terminate", "destroy") are left out for now — add one with its own
    // test row when a real prompt wants it.
    stems: ["delete", "remove"],
  },
  {
    group: "update",
    // Changing something in place. "modify" and "change" are left out: both
    // turn up constantly in ordinary descriptive text without naming a
    // console mutation, and matching everywhere makes that cost real.
    stems: ["update"],
  },
  {
    group: "rename",
    stems: ["rename"],
  },
  {
    group: "creation",
    // "add" is deliberately absent: it is used loosely for all sorts of non
    // mutating things ("add a bookmark", "add to the list"), and now that
    // matching is everywhere it would fire on far too much.
    stems: ["create"],
  },
  {
    group: "access change",
    // Handing out, taking away or switching off access. "enable" is left
    // out: it is also used for turning on read only things like logging.
    stems: ["grant", "revoke", "disable"],
  },
];

// Present tense, third person, past and continuous. A stem ending in "e"
// drops it before "ing" ("delete" gives "deleting", not "deleteing") and
// takes a bare "d" for the past ("deleted"), which covers every stem above.
function wordForms(stem: string): string[] {
  const endsInE = stem.endsWith("e");
  return [
    stem,
    `${stem}s`,
    endsInE ? `${stem}d` : `${stem}ed`,
    `${endsInE ? stem.slice(0, -1) : stem}ing`,
  ];
}

// One regex per group, built once at module load. \b on both sides keeps a
// form from matching inside a longer word, so "undelete" and "deletion" do
// not trip the deletion row.
const GROUP_PATTERNS: { group: ChangingVerbGroup; regex: RegExp }[] = CHANGING_VERB_GROUPS.map(
  (row) => ({
    group: row.group,
    regex: new RegExp(`\\b(?:${row.stems.flatMap(wordForms).join("|")})\\b`, "i"),
  })
);

export type ChangingStepFlag = {
  // 1 based, matching the numbers the page already shows next to the
  // parsed task list — see chala2001/grc-tools#140.
  stepNumber: number;
  group: ChangingVerbGroup;
};

/**
 * Looks at each already parsed subtask and says which ones mention changing
 * something rather than only looking at it. Takes the same subtask list the
 * Agent Runner page already parses out of the prompt and renders as its
 * numbered list, so a step number named here is always a step number that
 * exists on screen — see chala2001/grc-tools#140.
 *
 * A step is flagged when any form of a changing verb appears anywhere in it.
 * That deliberately includes ordinary capture prompts that merely name a
 * delete policy or an update history: they raise the banner, the Engineer
 * ticks the box once, and nothing is ever refused. See the comment on
 * CHANGING_VERB_GROUPS above for why that trade is the right way round.
 *
 * A step matching more than one group reports the first group in table
 * order, because the banner only needs to say what kind of change it saw,
 * not enumerate every one.
 *
 * Plain data in, plain data out — no React, no knowledge of how any of this
 * is drawn.
 */
export function detectChangingSteps(subtasks: string[]): ChangingStepFlag[] {
  const flagged: ChangingStepFlag[] = [];
  subtasks.forEach((step, index) => {
    const hit = GROUP_PATTERNS.find((p) => p.regex.test(step));
    if (hit) {
      flagged.push({ stepNumber: index + 1, group: hit.group });
    }
  });
  return flagged;
}
