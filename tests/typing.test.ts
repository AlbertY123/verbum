import { describe, expect, it } from "vitest";
import { normaliseTyping } from "../src/lib/learning";

describe("sentence studio keyboard equivalents", () => {
  it("accepts straight quotes for printed quotation marks and apostrophes", () => {
    expect(
      normaliseTyping("The wife’s reply, “No”, challenges the council."),
    ).toBe(normaliseTyping('The wife\'s reply, "No", challenges the council.'));
  });

  it("accepts keyboard hyphens and ordinary spaces for typographic alternatives", () => {
    expect(
      normaliseTyping(
        "The claim\u00a0– however plausible\u202f— remains unproven.",
      ),
    ).toBe("The claim - however plausible - remains unproven.");
    expect(normaliseTyping("self\u2011interest")).toBe("self-interest");
  });

  it("preserves meaningful differences in spelling, case and punctuation", () => {
    const expected = normaliseTyping("The narrator questions her motives.");
    expect(normaliseTyping("The narrator questions his motives.")).not.toBe(
      expected,
    );
    expect(normaliseTyping("the narrator questions her motives.")).not.toBe(
      expected,
    );
    expect(normaliseTyping("The narrator questions her motives")).not.toBe(
      expected,
    );
  });

  it("treats canonically equivalent accented characters consistently", () => {
    expect(normaliseTyping("The cafe\u0301 closes.")).toBe(
      normaliseTyping("The café closes."),
    );
  });
});
