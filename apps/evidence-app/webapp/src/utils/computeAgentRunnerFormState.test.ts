import { describe, expect, test } from "vitest";
import { computeAgentRunnerFormState } from "./computeAgentRunnerFormState";

describe("computeAgentRunnerFormState", () => {
  test("signed out — form stays locked even with a prompt typed", () => {
    const state = computeAgentRunnerFormState({
      loginDone: false,
      taskStatus: null,
      queueing: false,
      promptEmpty: false,
    });

    expect(state.promptEditable).toBe(true);
    expect(state.advancedSettingsEditable).toBe(true);
    expect(state.primaryAction).toBe("queue");
    expect(state.primaryActionEnabled).toBe(false);
    expect(state.resultPanelAction).toBe("startFresh");
  });

  test("no task, prompt empty — primary action is refused for lack of a prompt", () => {
    const state = computeAgentRunnerFormState({
      loginDone: true,
      taskStatus: null,
      queueing: false,
      promptEmpty: true,
    });

    expect(state.promptEditable).toBe(true);
    expect(state.advancedSettingsEditable).toBe(true);
    expect(state.primaryAction).toBe("queue");
    expect(state.primaryActionEnabled).toBe(false);
  });

  test("no task, prompt typed — the form is ready to queue", () => {
    const state = computeAgentRunnerFormState({
      loginDone: true,
      taskStatus: null,
      queueing: false,
      promptEmpty: false,
    });

    expect(state.advancedSettingsEditable).toBe(true);
    expect(state.primaryAction).toBe("queue");
    expect(state.primaryActionEnabled).toBe(true);
    expect(state.resultPanelAction).toBe("startFresh");
  });

  test("a queue request in flight — refused until it resolves", () => {
    const state = computeAgentRunnerFormState({
      loginDone: true,
      taskStatus: null,
      queueing: true,
      promptEmpty: false,
    });

    expect(state.primaryAction).toBe("queuing");
    expect(state.primaryActionEnabled).toBe(false);
    expect(state.advancedSettingsEditable).toBe(true);
  });

  test("task queued — waiting for the runner to pick it up", () => {
    const state = computeAgentRunnerFormState({
      loginDone: true,
      taskStatus: "queued",
      queueing: false,
      promptEmpty: false,
    });

    expect(state.promptEditable).toBe(true);
    expect(state.advancedSettingsEditable).toBe(false);
    expect(state.primaryAction).toBe("waitingForRunner");
    expect(state.primaryActionEnabled).toBe(false);
    expect(state.resultPanelAction).toBe("startFresh");
  });

  test("task running — the prompt stays editable so the next one can be drafted", () => {
    const state = computeAgentRunnerFormState({
      loginDone: true,
      taskStatus: "running",
      queueing: false,
      promptEmpty: false,
    });

    expect(state.promptEditable).toBe(true);
    expect(state.advancedSettingsEditable).toBe(false);
    expect(state.primaryAction).toBe("runningAgent");
    expect(state.primaryActionEnabled).toBe(false);
    expect(state.resultPanelAction).toBe("startFresh");
  });

  test("task completed — the primary action reverts to queue, but stays disabled, and the result panel offers a new task", () => {
    const state = computeAgentRunnerFormState({
      loginDone: true,
      taskStatus: "completed",
      queueing: false,
      promptEmpty: false,
    });

    expect(state.promptEditable).toBe(true);
    expect(state.advancedSettingsEditable).toBe(false);
    expect(state.primaryAction).toBe("queue");
    expect(state.primaryActionEnabled).toBe(false);
    expect(state.resultPanelAction).toBe("newTask");
  });

  test("task failed — same finished shape as completed", () => {
    const state = computeAgentRunnerFormState({
      loginDone: true,
      taskStatus: "failed",
      queueing: false,
      promptEmpty: false,
    });

    expect(state.advancedSettingsEditable).toBe(false);
    expect(state.primaryAction).toBe("queue");
    expect(state.primaryActionEnabled).toBe(false);
    expect(state.resultPanelAction).toBe("newTask");
  });

  test("task cancelled — same finished shape as completed", () => {
    const state = computeAgentRunnerFormState({
      loginDone: true,
      taskStatus: "cancelled",
      queueing: false,
      promptEmpty: false,
    });

    expect(state.advancedSettingsEditable).toBe(false);
    expect(state.primaryAction).toBe("queue");
    expect(state.primaryActionEnabled).toBe(false);
    expect(state.resultPanelAction).toBe("newTask");
  });
});
