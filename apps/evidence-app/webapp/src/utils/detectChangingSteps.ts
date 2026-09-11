// The verb groups a step's leading word can fall into. Kept as a union
// rather than a bare string so a typo in a call site is a compile error, not
// a silent no-match.
export type ChangingVerbGroup = "deletion" | "update" | "rename" | "creation" | "access change";

type ChangingVerbGroupRow = {
  group: ChangingVerbGroup;
  verbs: string[];
};

// One row per group of changing verbs the Agent Runner should pause on.
// Deliberately short — see chala2001/grc-tools#136: a missing verb is a one
// line addition with its own test row, but a table padded out on day one
// trains an Engineer to stop reading the banner. Only the leading word of a
// step is ever checked against these (see detectChangingSteps below), so a
// verb only needs to be here if it is unambiguous as the FIRST word of an
// instruction — a word that shows up harmlessly mid sentence in ordinary
// Evidence prompts ("screenshot the delete protection setting") is never a
// problem, because that occurrence is never in leading position.
const CHANGING_VERB_GROUPS: ChangingVerbGroupRow[] = [
  {
    group: "deletion",
    // "delete" and "remove" both name outright destruction with no
    // reasonable second meaning in console work. Rarer synonyms ("erase",
    // "wipe", "purge") are left out for the first version — add one only
    // once it has its own test row.
    verbs: ["delete", "remove"],
  },
  {
    group: "update",
    // "update" changes something in place. "modify" and "change" are left
    // out: both turn up constantly in ordinary descriptive text ("change
    // the filter", "modify the view") without naming a console mutation.
    verbs: ["update"],
  },
  {
    group: "rename",
    // "rename" only. Unambiguous on its own and has no common alternate
    // meaning in console work.
    verbs: ["rename"],
  },
  {
    group: "creation",
    // "create" only. "add" is left out: it is used loosely for all sorts of
    // non mutating things ("add a bookmark", "add to the list") and would
    // false positive too often as a leading word.
    verbs: ["create"],
  },
  {
    group: "access change",
    // "grant" and "revoke" hand out or take away access outright. "disable"
    // is included because disabling a policy or a protection setting is the
    // same kind of change. "enable" is left out for the first version: it is
    // also used for turning on read only things like logging or
    // diagnostics, which is a weaker signal.
    verbs: ["grant", "revoke", "disable"],
  },
];

// One flat lookup from verb to group, built once at module load rather than
// scanning every row for every step.
const VERB_TO_GROUP = new Map<string, ChangingVerbGroup>();
for (const row of CHANGING_VERB_GROUPS) {
  for (const verb of row.verbs) {
    VERB_TO_GROUP.set(verb, row.group);
  }
}

export type ChangingStepFlag = {
  // 1 based, matching the numbers the page already shows next to the
  // parsed task list — see chala2001/grc-tools#140.
  stepNumber: number;
  group: ChangingVerbGroup;
};

// A step's own leading word: the first run of letters on its first line,
// lower cased for a case insensitive, whole word match against the verb
// table. A multi line step (the page joins a wrapped subtask with "\n")
// only ever has its first line's first word considered.
function leadingWord(step: string): string {
  const firstLine = step.split("\n", 1)[0] ?? "";
  const match = firstLine.trim().match(/^[A-Za-z]+/);
  return match ? match[0].toLowerCase() : "";
}

/**
 * Looks at each already parsed subtask and says which ones read as an
 * instruction to change something, rather than to look at something. Takes
 * the same subtask list the Agent Runner page already parses out of the
 * prompt and renders as its numbered list, so a step number named here is
 * always a step number that exists on screen — see
 * chala2001/grc-tools#140.
 *
 * The rule is one word: the verb a step STARTS with. A changing word
 * appearing later in a step is ignored, which is what keeps an ordinary
 * capture prompt like "Screenshot the delete protection setting" silent. A
 * step with no leading verb from the table at all — including a step that
 * only navigates and filters, with no capture verb of its own — is also
 * silent, on purpose: see chala2001/grc-tools#136 for why a "must contain a
 * capture verb" rule was considered and rejected.
 *
 * Plain data in, plain data out — no React, no knowledge of how any of this
 * is drawn.
 */
export function detectChangingSteps(subtasks: string[]): ChangingStepFlag[] {
  const flagged: ChangingStepFlag[] = [];
  subtasks.forEach((step, index) => {
    const group = VERB_TO_GROUP.get(leadingWord(step));
    if (group) {
      flagged.push({ stepNumber: index + 1, group });
    }
  });
  return flagged;
}
