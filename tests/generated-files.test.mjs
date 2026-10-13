import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { parseRegexLiteral } from "../src/generator.mjs";

const hasBuild = existsSync(new URL("../Brazilian/regexes.json", import.meta.url))
  && existsSync(new URL("./release-titles.json", import.meta.url));

test("generated JSON files and guide-derived title fixtures", { skip: !hasBuild }, () => {
  const regexes = JSON.parse(readFileSync(new URL("../Brazilian/regexes.json", import.meta.url), "utf8"));
  const expressions = JSON.parse(readFileSync(new URL("../Brazilian/expressions.json", import.meta.url), "utf8"));
  const fixtures = JSON.parse(readFileSync(new URL("./release-titles.json", import.meta.url), "utf8"));
  assert.ok(regexes.length > 180);
  assert.ok(expressions.length > 250);
  const byName = new Map(regexes.map((item) => [item.name, item]));
  for (const fixture of fixtures) {
    const rule = byName.get(fixture.regexName);
    assert.ok(rule, `Missing regex ${fixture.regexName}`);
    assert.equal(parseRegexLiteral(rule.pattern).test(fixture.title), fixture.expected, `${fixture.title} / ${fixture.regexName}`);
  }
});
