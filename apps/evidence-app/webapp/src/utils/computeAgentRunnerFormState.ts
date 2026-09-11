// The Agent Task statuses the backend ever sets on a queued run. Kept
// structural rather than imported from the page, so this module carries no
// dependency on AgentRunner.tsx or its wider TaskOut shape.
export type AgentRunnerTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

// What the primary button on the run form is offering right now. "queue" is
// the resting state — everything else is something already in flight, which
// is also, today, exactly when the button shows a spinner instead of the
// arrow icon.
export type AgentRunnerPrimaryAction = "queue" | "queuing" | "waitingForRunner" | "runningAgent";

export type ComputeAgentRunnerFormStateArgs = {
  // Whether the Engineer has clicked "I've logged in" for Step 1.
  loginDone: boolean;
  // The current Agent Task's status, or null when there is no task yet
  // (before the first queue, or after New Task has cleared one).
  taskStatus: AgentRunnerTaskStatus | null;
  // Whether the createTask request is in flight.
  queueing: boolean;
  // Whether the prompt field is blank (after trimming).
  promptEmpty: boolean;
};

export type AgentRunnerFormState = {
  // Whether the prompt field accepts typing. Always true today — the run
  // form has never locked the prompt. It's part of this shape because the
  // next ticket (chala2001/grc-tools#139) makes it false once a task has finished; carrying the
  // field now means that change is a one-line edit to this function instead
  // of a new call site in the page.
  promptEditable: boolean;
  // Whether the Advanced settings panel can be opened and its controls
  // changed. False while a task is running or has finished, so a setting
  // can't be changed mid run or against a result that's no longer live.
  advancedSettingsEditable: boolean;
  // What the primary button offers.
  primaryAction: AgentRunnerPrimaryAction;
  // Whether pressing the primary button right now would do anything.
  primaryActionEnabled: boolean;
  // What the panel below a task's result offers: a way to clear a still
  // running task and start over, or a genuine new task once one has
  // finished.
  resultPanelAction: "startFresh" | "newTask";
};

/**
 * Works out what the Agent Runner's run form should look like: whether the
 * prompt can be typed into, what the primary button offers and whether it's
 * enabled, whether Advanced settings can be touched, and what the panel
 * below a result offers. Plain data in, plain data out — no React, no
 * knowledge of how any of this is drawn.
 *
 * Used to be five separate ad hoc checks against two booleans ("a task is
 * running", "a task has finished"), each restated at its own call site in
 * AgentRunner.tsx, roughly ten of them. Pulled out here so the rule for each
 * lives in one place — see ticket chala2001/grc-tools#138.
 *
 * Deliberately does not cover the effects that poll the Agent Task and
 * subscribe to its live updates. Those decide whether to keep talking to
 * the backend, not what the form looks like, and stay exactly as they were.
 */
export function computeAgentRunnerFormState({
  loginDone,
  taskStatus,
  queueing,
  promptEmpty,
}: ComputeAgentRunnerFormStateArgs): AgentRunnerFormState {
  const isDone = taskStatus !== null && ["completed", "failed", "cancelled"].includes(taskStatus);
  const isRunning = taskStatus !== null && !isDone;

  const primaryAction: AgentRunnerPrimaryAction = queueing
    ? "queuing"
    : isRunning
      ? taskStatus === "queued"
        ? "waitingForRunner"
        : "runningAgent"
      : "queue";

  return {
    promptEditable: true,
    advancedSettingsEditable: !isRunning && !isDone,
    primaryAction,
    primaryActionEnabled: loginDone && !promptEmpty && !queueing && !isRunning && !isDone,
    resultPanelAction: isDone ? "newTask" : "startFresh",
  };
}
