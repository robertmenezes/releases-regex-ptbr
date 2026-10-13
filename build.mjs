import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  asRegexLiteral,
  combineGroupPatterns,
  ensureUniqueNames,
  extractGroupSpecs,
  extractTitleSpecs,
  makeExpression,
  makeRegexAddition,
  replaceExpressionHeader,
  replaceRegexHeader,
  updateTemplateForBrazilian,
} from "./src/generator.mjs";

const SOURCES = {
  englishRegexes: "https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json",
  englishExpressions: "https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/expressions.json",
  template: "https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/all-templates.json",
  dual: "https://raw.githubusercontent.com/marcosviniciusi/trash-guides-ptbr/stable/custom-formats/custom-brazilian-group-tier-dual-audio.json",
  dubbed: "https://raw.githubusercontent.com/marcosviniciusi/trash-guides-ptbr/stable/custom-formats/custom-brazilian-group-tier-dubbed.json",
  subtitles: "https://raw.githubusercontent.com/marcosviniciusi/trash-guides-ptbr/stable/custom-formats/custom-brazilian-group-tier-subtitles.json",
  bad: "https://raw.githubusercontent.com/marcosviniciusi/trash-guides-ptbr/stable/custom-formats/custom-brazilian-group-tier-bad.json",
};

const DEFAULT_RAW_BASE_URL = "https://raw.githubusercontent.com/OWNER/REPO/main";

function getArg(name) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const rawBaseUrl = (getArg("--base-url") || process.env.BRAZILIAN_RELEASES_REGEX_BASE_URL || DEFAULT_RAW_BASE_URL).replace(/\/$/, "");

async function getJson(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Brazilian-Releases-Regex-builder/0.1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GET ${url} failed with HTTP ${response.status}`);
  const text = await response.text();
  try {
    return { data: JSON.parse(text), chars: text.length };
  } catch (error) {
    throw new Error(`Could not parse JSON from ${url}: ${error.message}`);
  }
}

async function main() {
  console.log("Fetching English base, template and TRaSH Guides PT-BR group lists…");
  const keys = Object.keys(SOURCES);
  const fetched = Object.fromEntries(await Promise.all(keys.map(async (key) => [key, await getJson(SOURCES[key])])));

  const englishRegexes = fetched.englishRegexes.data;
  const englishExpressions = fetched.englishExpressions.data;
  const template = fetched.template.data;
  for (const [key, value] of Object.entries({ englishRegexes, englishExpressions, template })) {
    if (!Array.isArray(value) || value.length === 0) throw new Error(`${key} did not return a non-empty array.`);
  }

  const dual = fetched.dual.data;
  const dubbed = fetched.dubbed.data;
  const subtitles = fetched.subtitles.data;
  const bad = fetched.bad.data;
  const dualGroups = extractGroupSpecs(dual);
  const dubbedGroups = extractGroupSpecs(dubbed);
  const subtitleGroups = extractGroupSpecs(subtitles);
  const badGroups = extractGroupSpecs(bad);
  const allGroups = [...dualGroups, ...dubbedGroups, ...subtitleGroups];

  // Title markers are preserved from the source specs rather than re-invented.
  // `NOT Dual Audio` is a negated Custom Format condition, not a positive tag;
  // we validate it exists but do not turn its negated semantics into a positive RSE.
  const dualMarker = extractTitleSpecs(dual).find((spec) => spec.name === "Brazilian Dual Audio");
  const dubbedMarker = extractTitleSpecs(dubbed).find((spec) => spec.name === "Brazilian Dubbed");
  const notDualMarker = extractTitleSpecs(dubbed).find((spec) => spec.name === "NOT Dual Audio");
  if (!dualMarker || !dubbedMarker || !notDualMarker) throw new Error("One or more expected Brazilian title markers were not found.");

  const headerRegexName = "Brazilian Releases Regexes (synced)";
  const headerExpressionName = "Brazilian Releases Ranked Stream Expressions (synced)";

  // These two English RSE rules penalize "Bad Dual" groups for language-track
  // ordering. They are not general release-quality tiers, and the Brazilian
  // variant should not inherit that assumption without Brazilian-specific evidence.
  const badDualRegexNames = new Set(["Radarr Bad Dual Groups", "Sonarr Bad Dual Groups"]);
  const regexes = replaceRegexHeader(englishRegexes, headerRegexName)
    .filter((item, index) => index === 0 || !badDualRegexNames.has(item.name));
  const expressions = replaceExpressionHeader(englishExpressions, headerExpressionName)
    .filter((item, index) => index === 0 || !item.expression.includes("/*Bad Dual*/"));

  const additions = [
    makeRegexAddition("Brazilian Known Groups", combineGroupPatterns(allGroups)),
    makeRegexAddition("Brazilian Dual Audio Groups", combineGroupPatterns(dualGroups)),
    makeRegexAddition("Brazilian Dubbed Groups", combineGroupPatterns(dubbedGroups)),
    makeRegexAddition("Brazilian Subtitle Groups", combineGroupPatterns(subtitleGroups)),
    makeRegexAddition("Brazilian Bad Groups", combineGroupPatterns(badGroups)),
    makeRegexAddition("Brazilian Dual Audio Tag", dualMarker.pattern),
    makeRegexAddition("Brazilian Dubbed Tag", dubbedMarker.pattern),
  ];
  regexes.push(...additions);
  // Upstream intentionally has duplicate regex names for some variant-specific patterns.
  // Only require the added Brazilian names to be unique and collision-free.
  ensureUniqueNames(additions, "name", "Brazilian regex additions");
  const upstreamRegexNames = new Set(englishRegexes.map((item) => item.name));
  const collidingNames = additions.filter((item) => upstreamRegexNames.has(item.name)).map((item) => item.name);
  if (collidingNames.length) throw new Error(`Brazilian regex names collide with English names: ${collidingNames.join(", ")}`);

  // The source does not assign distinct quality sub-tiers to the 451-group pool.
  // Group and title-marker expressions are therefore neutral tagging expressions;
  // only the explicitly named bad-group list is penalized in this first iteration.
  const expressionAdditions = [
    makeExpression("/*#Brazilian*/ /*Known group pool*/ regexMatched(streams, 'Brazilian Known Groups')", 0),
    makeExpression("/*#Brazilian*/ /*Dual Audio tag*/ regexMatched(streams, 'Brazilian Dual Audio Tag')", 0),
    makeExpression("/*#Brazilian*/ /*Dubbed tag*/ regexMatched(streams, 'Brazilian Dubbed Tag')", 0),
    makeExpression("/*#Brazilian*/ /*Bad groups*/ regexMatched(streams, 'Brazilian Bad Groups')", -35000),
  ];
  expressions.push(...expressionAdditions);

  const outputDir = join(process.cwd(), "Brazilian");
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, "regexes.json"), `${JSON.stringify(regexes, null, 2)}\n`, "utf8");
  await writeFile(join(outputDir, "expressions.json"), `${JSON.stringify(expressions, null, 2)}\n`, "utf8");

  const generatedTemplate = updateTemplateForBrazilian(template, rawBaseUrl);
  await writeFile(join(process.cwd(), "all-templates.json"), `${JSON.stringify(generatedTemplate, null, 2)}\n`, "utf8");

  const groupNameSets = {
    dualAudio: new Set(dualGroups.map((x) => x.name)),
    dubbed: new Set(dubbedGroups.map((x) => x.name)),
    subtitles: new Set(subtitleGroups.map((x) => x.name)),
    bad: new Set(badGroups.map((x) => x.name)),
  };
  const union = new Set([...groupNameSets.dualAudio, ...groupNameSets.dubbed, ...groupNameSets.subtitles]);
  const intersection = [...groupNameSets.dualAudio].filter((name) => groupNameSets.dubbed.has(name) && groupNameSets.subtitles.has(name));
  const audit = {
    generatedAt: new Date().toISOString(),
    sources: SOURCES,
    note: "Group source lists are treated as recognition pools, not quality tiers. Group order is not converted into scores.",
    counts: {
      englishRegexes: englishRegexes.length,
      generatedRegexes: regexes.length,
      englishExpressions: englishExpressions.length,
      generatedExpressions: expressions.length,
      groupsDualAudio: groupNameSets.dualAudio.size,
      groupsDubbed: groupNameSets.dubbed.size,
      groupsSubtitles: groupNameSets.subtitles.size,
      uniqueKnownGroups: union.size,
      groupsSharedAcrossAllThreePools: intersection.length,
      badGroups: groupNameSets.bad.size,
      regexAdditions: additions.length,
      expressionAdditions: expressionAdditions.length,
      removedEnglishBadDualRegexes: englishRegexes.filter((item) => badDualRegexNames.has(item.name)).length,
      removedEnglishBadDualExpressions: englishExpressions.filter((item) => item.expression.includes("/*Bad Dual*/")).length,
    },
    sourceFileCharacters: Object.fromEntries(Object.entries(fetched).map(([key, value]) => [key, value.chars])),
    templateRawBaseUrl: rawBaseUrl,
  };
  await writeFile(join(outputDir, "source-audit.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");

  console.log(`Generated ${outputDir}/regexes.json (${regexes.length} rules)`);
  console.log(`Generated ${outputDir}/expressions.json (${expressions.length} expressions)`);
  console.log(`Generated all-templates.json with the Brazilian variant`);
  console.log(`Unique known groups: ${union.size}; bad groups: ${groupNameSets.bad.size}`);
  if (rawBaseUrl.includes("OWNER/REPO")) {
    console.warn("WARNING: all-templates.json still uses the OWNER/REPO placeholder. Rebuild with --base-url after choosing your repository URL.");
  }
}

main().catch((error) => {
  console.error(`Build failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
