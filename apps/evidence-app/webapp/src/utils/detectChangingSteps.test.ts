import { describe, expect, test } from "vitest";
import { detectChangingSteps } from "./detectChangingSteps";

// Shorthand: "3:deletion" reads better in a failure than a nested object.
const flags = (subtasks: string[]) =>
  detectChangingSteps(subtasks).map((f) => `${f.stepNumber}:${f.group}`);

describe("detectChangingSteps", () => {
  test("a step that is only a changing verb is flagged", () => {
    expect(flags(["delete"])).toEqual(["1:deletion"]);
    expect(flags(["update"])).toEqual(["1:update"]);
  });

  test("a step with no list marker space is still flagged", () => {
    // The prompt parser needs a space after "1." to split a list item, so a
    // prompt typed as "1.delete" arrives here as one step still carrying its
    // marker. Matching anywhere is what makes that work.
    expect(flags(["1.delete"])).toEqual(["1:deletion"]);
    expect(flags(["2)remove the bucket"])).toEqual(["1:deletion"]);
  });

  test("a changing verb at the end of a step is flagged", () => {
    expect(flags(["find chalaka123 key vaults and delete"])).toEqual(["1:deletion"]);
    expect(flags(["go to the resource group, then remove it"])).toEqual(["1:deletion"]);
  });

  test("a changing verb after a polite opening is flagged", () => {
    expect(flags(["Please delete the test account"])).toEqual(["1:deletion"]);
  });

  test("every word form of a verb is flagged", () => {
    expect(flags(["delete it"])).toEqual(["1:deletion"]);
    expect(flags(["deletes it"])).toEqual(["1:deletion"]);
    expect(flags(["deleted it"])).toEqual(["1:deletion"]);
    expect(flags(["deleting it"])).toEqual(["1:deletion"]);
  });

  test("case does not matter", () => {
    expect(flags(["DELETE the test user"])).toEqual(["1:deletion"]);
    expect(flags(["Delete the test user"])).toEqual(["1:deletion"]);
  });

  test("one case per verb group", () => {
    expect(flags(["delete the vault"])).toEqual(["1:deletion"]);
    expect(flags(["remove the vault"])).toEqual(["1:deletion"]);
    expect(flags(["update the policy"])).toEqual(["1:update"]);
    expect(flags(["rename the group"])).toEqual(["1:rename"]);
    expect(flags(["create a new bucket"])).toEqual(["1:creation"]);
    expect(flags(["grant reader to the group"])).toEqual(["1:access change"]);
    expect(flags(["revoke the key"])).toEqual(["1:access change"]);
    expect(flags(["disable the protection setting"])).toEqual(["1:access change"]);
  });

  test("an ordinary capture prompt is silent", () => {
    expect(flags(["Go to Key Vault X and screenshot the access policy"])).toEqual([]);
    expect(flags(["Go to S3, find bucket cloudcare-k8s, screenshot the objects list"])).toEqual([]);
    expect(flags(["find India cricket"])).toEqual([]);
  });

  test("the application's own example prompts are silent", () => {
    // Both come from the help text the Agent Runner page shows. If either
    // ever starts warning, the page is teaching the banner to be ignored.
    expect(
      flags(['Go to Key Vaults, filter by label "env:prod"', "EACH-PAGE: Screenshot page {page} of the filtered results"])
    ).toEqual([]);
    expect(
      flags(["PDF: Open https://github.com/org/repo/issues/123, expand all comments, then export as PDF"])
    ).toEqual([]);
  });

  test("a capture prompt that merely names a delete setting IS flagged, on purpose", () => {
    // This is the deliberate cost of matching everywhere. The Engineer ticks
    // the box once. Missing a real deletion costs a resource; this costs a
    // click. See the module comment.
    expect(flags(["Screenshot the delete protection setting"])).toEqual(["1:deletion"]);
    expect(flags(["Screenshot the update history for this resource"])).toEqual(["1:update"]);
  });

  test("a verb inside a longer word is not flagged", () => {
    expect(flags(["undelete the row"])).toEqual([]);
    expect(flags(["screenshot the deletion policy page"])).toEqual([]);
    expect(flags(["open the creation date column"])).toEqual([]);
  });

  test("several flagged steps come back with the right numbers", () => {
    expect(
      flags([
        "Go to S3, screenshot objects",
        "Delete the old bucket",
        "Screenshot the results",
        "rename the group",
      ])
    ).toEqual(["2:deletion", "4:rename"]);
  });

  test("nothing flagged returns an empty result", () => {
    expect(flags(["screenshot the page", "export it as a PDF"])).toEqual([]);
  });

  test("no steps at all returns an empty result", () => {
    expect(flags([])).toEqual([]);
  });

  test("a step matching two groups reports the first in table order", () => {
    expect(flags(["delete and rename the group"])).toEqual(["1:deletion"]);
  });

  test("a multi line step is searched in full, not just its first line", () => {
    expect(flags(["Go to the vault\nthen delete it"])).toEqual(["1:deletion"]);
  });
});
