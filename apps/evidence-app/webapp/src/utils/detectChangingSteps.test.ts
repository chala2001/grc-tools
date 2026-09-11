import { describe, expect, test } from "vitest";
import { detectChangingSteps } from "./detectChangingSteps";

describe("detectChangingSteps", () => {
  test("a step whose leading verb changes something is flagged", () => {
    const flagged = detectChangingSteps(["Delete the test storage account"]);

    expect(flagged).toEqual([{ stepNumber: 1, group: "deletion" }]);
  });

  test("a step that merely contains a changing word later is not flagged", () => {
    const flagged = detectChangingSteps(["Screenshot the delete protection setting"]);

    expect(flagged).toEqual([]);
  });

  test("a step that only navigates and filters, with no capture verb, is not flagged", () => {
    const flagged = detectChangingSteps(['Go to Key Vaults, filter by label "env:prod"']);

    expect(flagged).toEqual([]);
  });

  test("a single line prompt with no numbering is assessed like any other step", () => {
    const flagged = detectChangingSteps(["Delete the test user"]);

    expect(flagged).toEqual([{ stepNumber: 1, group: "deletion" }]);
  });

  test("several flagged steps return all of them with the right numbers", () => {
    const flagged = detectChangingSteps([
      "Go to Key Vaults, filter by label env:prod",
      "Delete the test storage account",
      "Screenshot the access policy",
      "Rename the resource group to archive",
    ]);

    expect(flagged).toEqual([
      { stepNumber: 2, group: "deletion" },
      { stepNumber: 4, group: "rename" },
    ]);
  });

  test("nothing flagged returns an empty result", () => {
    const flagged = detectChangingSteps([
      "Go to S3, find bucket cloudcare-k8s, screenshot the objects list",
      "Go to EC2, find instance cloud-care, screenshot the details page",
    ]);

    expect(flagged).toEqual([]);
  });

  test("deletion group — delete and remove", () => {
    expect(detectChangingSteps(["Delete the test storage account"])).toEqual([
      { stepNumber: 1, group: "deletion" },
    ]);
    expect(detectChangingSteps(["Remove the old firewall rule"])).toEqual([
      { stepNumber: 1, group: "deletion" },
    ]);
  });

  test("update group", () => {
    expect(detectChangingSteps(["Update the retention policy to 90 days"])).toEqual([
      { stepNumber: 1, group: "update" },
    ]);
  });

  test("rename group", () => {
    expect(detectChangingSteps(["Rename the resource group to archive"])).toEqual([
      { stepNumber: 1, group: "rename" },
    ]);
  });

  test("creation group", () => {
    expect(detectChangingSteps(["Create a new service principal"])).toEqual([
      { stepNumber: 1, group: "creation" },
    ]);
  });

  test("access change group — grant, revoke and disable", () => {
    expect(detectChangingSteps(["Grant the engineer group Contributor access"])).toEqual([
      { stepNumber: 1, group: "access change" },
    ]);
    expect(detectChangingSteps(["Revoke the guest user's access"])).toEqual([
      { stepNumber: 1, group: "access change" },
    ]);
    expect(detectChangingSteps(["Disable the delete protection setting"])).toEqual([
      { stepNumber: 1, group: "access change" },
    ]);
  });

  test("matches are whole word and case insensitive", () => {
    expect(detectChangingSteps(["DELETE the test storage account"])).toEqual([
      { stepNumber: 1, group: "deletion" },
    ]);
    // "Deleted" is not the whole word "delete", so it must not match.
    expect(detectChangingSteps(["Deleted resources are shown in the audit log"])).toEqual([]);
  });

  test("a multi line step is assessed by its first line's first word only", () => {
    const flagged = detectChangingSteps([
      "Delete the test storage account\nand confirm the prompt",
      "Screenshot the result\nDelete nothing else",
    ]);

    expect(flagged).toEqual([{ stepNumber: 1, group: "deletion" }]);
  });

  test("an empty subtask list returns an empty result", () => {
    expect(detectChangingSteps([])).toEqual([]);
  });
});
