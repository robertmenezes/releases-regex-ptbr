import test from "node:test";
import assert from "node:assert/strict";
import {
  asRegexLiteral,
  combineGroupPatterns,
  escapeRegexLiteral,
  extractGroupSpecs,
  extractTitleSpecs,
  headerRegexEntry,
  parseRegexLiteral,
  replaceExpressionHeader,
  replaceRegexHeader,
  updateTemplateForBrazilian,
} from "../src/generator.mjs";

test("extracts only ReleaseGroupSpecification entries", () => {
  const source = {
    specifications: [
      { name: "title", implementation: "ReleaseTitleSpecification", fields: { value: "\\bDUAL\\b" } },
      { name: "A.B", implementation: "ReleaseGroupSpecification", fields: { value: "(?:^|-)A\\.B$" } },
      { name: "missing", implementation: "ReleaseGroupSpecification", fields: {} },
    ],
  };
  assert.deepEqual(extractGroupSpecs(source), [{ name: "A.B", pattern: "(?:^|-)A\\.B$" }]);
});

test("extracts source title markers and negate flags", () => {
  const source = { specifications: [
    { name: "Brazilian Dubbed", implementation: "ReleaseTitleSpecification", negate: false, required: true, fields: { value: "(?i)\\b(dublado)\\b" } },
    { name: "NOT Dual Audio", implementation: "ReleaseTitleSpecification", negate: true, required: true, fields: { value: "\\bDUAL\\b" } },
  ]};
  assert.deepEqual(extractTitleSpecs(source).map(({name, negate}) => ({name, negate})), [
    {name: "Brazilian Dubbed", negate: false}, {name: "NOT Dual Audio", negate: true},
  ]);
});

test("combines anchored group patterns without breaking alternatives", () => {
  const combined = combineGroupPatterns([
    { name: "BiOMA", pattern: "(?:^|-)BiOMA$" },
    { name: "C.A.A", pattern: "(?:^|-)C\\.A\\.A$" },
  ]);
  const regex = new RegExp(combined, "i");
  assert.equal(regex.test("Movie.2024.1080p-BiOMA"), true);
  assert.equal(regex.test("Movie.2024.1080p-DUAL-C.A.A"), true);
  assert.equal(regex.test("Movie.2024.1080p-FLUX"), false);
});

test("slash-delimited regexes compile and source (?i) is normalized", () => {
  assert.equal(parseRegexLiteral(asRegexLiteral("(?i)\\b(dublado)\\b")).test("FILME DUBLADO"), true);
  assert.equal(parseRegexLiteral(asRegexLiteral("(?:^|-)C\\.A\\.A$")).test("Movie-C.A.A"), true);
});

test("rewrites only the template's sync marker entries", () => {
  const regexHeader = headerRegexEntry("Brazilian Releases Regexes (synced)");
  assert.equal(parseRegexLiteral(regexHeader.pattern).test(regexHeader.name), false);
  assert.ok(escapeRegexLiteral("Brazilian (synced)").includes("\\("));
  const regexes = replaceRegexHeader([{name: "old", pattern: "/x/", score: 0}, {name: "base", pattern: "/y/", score: 0}], "new header");
  assert.equal(regexes[0].name, "new header");
  assert.equal(regexes[1].name, "base");
  const expr = replaceExpressionHeader([{expression: "old header", score: 0, enabled: true}, {expression: "base", score: 10, enabled: true}], "Brazilian");
  assert.equal(expr[0].expression, "/*#Brazilian*/ []");
  assert.equal(expr[1].expression, "base");
});

test("adds Brazilian variant URLs to the template schema", () => {
  const original = [{
    metadata: { id: "id", name: "old", author: "old", version: "2", description: "", inputs: [{id: "variant", options: [{value: "english", label: "English"}]}] },
    config: {
      rankedRegexPatterns: { __value: { __switch: "inputs.variant", cases: { english: [{name: "h", pattern: "/x/", score: 0}, {pattern: "<SYNCED: old>", name: "", score: 0}] } } },
      syncedRankedRegexUrls: { __switch: "inputs.variant", cases: { english: ["old"] } },
      rankedStreamExpressions: { __value: { __switch: "inputs.variant", cases: { english: [{expression: "/*header*/ []", score: 0, enabled: true}, {expression: "/*guide*/ []", score: 0, enabled: true}, {expression: "<SYNCED: old>", score: 0, enabled: true}] } } },
      syncedRankedStreamExpressionUrls: { __switch: "inputs.variant", cases: { english: ["old"] } },
    },
  }];
  const changed = updateTemplateForBrazilian(original, "https://raw.githubusercontent.com/example/repo/main")[0];
  assert.equal(changed.metadata.name, "Brazilian Releases Regex");
  assert.ok(changed.metadata.inputs[0].options.some((option) => option.value === "brazilian"));
  assert.deepEqual(changed.config.syncedRankedRegexUrls.cases.brazilian, ["https://raw.githubusercontent.com/example/repo/main/Brazilian/regexes.json"]);
  assert.deepEqual(changed.config.syncedRankedStreamExpressionUrls.cases.brazilian, ["https://raw.githubusercontent.com/example/repo/main/Brazilian/expressions.json"]);
});
