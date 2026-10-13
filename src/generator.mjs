/**
 * Helpers for building a Brazilian-focused Releases-Regex variant.
 * The source TRaSH JSONs are consumed as data; no quality tier is inferred
 * from their ordering because the three group lists currently contain the
 * same group pool.
 */

export function escapeRegexLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractGroupSpecs(format) {
  return (format?.specifications ?? [])
    .filter((spec) => spec.implementation === "ReleaseGroupSpecification")
    .map((spec) => {
      const name = String(spec.name ?? "").trim();
      const pattern = String(spec.fields?.value ?? "").trim();
      if (!name || !pattern) return null;
      return { name, pattern };
    })
    .filter(Boolean);
}

export function extractTitleSpecs(format) {
  return (format?.specifications ?? [])
    .filter((spec) => spec.implementation === "ReleaseTitleSpecification")
    .map((spec) => ({
      name: String(spec.name ?? "").trim(),
      pattern: String(spec.fields?.value ?? "").trim(),
      negate: Boolean(spec.negate),
      required: Boolean(spec.required),
    }))
    .filter((spec) => spec.name && spec.pattern);
}

export function uniqueSpecsByPattern(specs) {
  const unique = new Map();
  for (const spec of specs) {
    const key = spec.pattern;
    if (!unique.has(key)) unique.set(key, spec);
  }
  return [...unique.values()];
}

/**
 * TRaSH group patterns are already anchored release-group expressions such as
 * (?:^|-)BiOMA$. Wrapping each whole pattern as an alternative preserves the
 * anchor semantics while building one compact regex entry.
 */
export function combineGroupPatterns(specs) {
  const patterns = uniqueSpecsByPattern(specs).map((spec) => `(?:${spec.pattern})`);
  if (patterns.length === 0) throw new Error("No ReleaseGroupSpecification patterns were found.");
  return `(?:${patterns.join("|")})`;
}

export function asRegexLiteral(source, flags = "i") {
  const normalized = source.replace(/^\(\?i\)/i, "");
  // Escape slashes that would otherwise close the /pattern/flags notation.
  const delimited = normalized.replace(/(?<!\\)\//g, "\\/");
  return `/${delimited}/${flags}`;
}

export function headerRegexEntry(name) {
  const literal = escapeRegexLiteral(name);
  return {
    name,
    pattern: `/^(?!${literal})${literal}$/`,
    score: 0,
  };
}

export function replaceRegexHeader(regexes, headerName) {
  if (!Array.isArray(regexes) || regexes.length === 0) {
    throw new Error("The source regex list is empty.");
  }
  const output = structuredClone(regexes);
  output[0] = headerRegexEntry(headerName);
  return output;
}

export function replaceExpressionHeader(expressions, headerText) {
  if (!Array.isArray(expressions) || expressions.length === 0) {
    throw new Error("The source expressions list is empty.");
  }
  const output = structuredClone(expressions);
  output[0] = {
    expression: `/*#${headerText}*/ []`,
    score: 0,
    enabled: true,
  };
  return output;
}

export function makeRegexAddition(name, source, score = 0) {
  return { name, pattern: asRegexLiteral(source), score };
}

export function makeExpression(expression, score = 0, enabled = true) {
  return { expression, score, enabled };
}

export function parseRegexLiteral(value) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    throw new Error(`Not a slash-delimited regex literal: ${value}`);
  }
  const lastSlash = value.lastIndexOf("/");
  if (lastSlash <= 0) throw new Error(`Malformed regex literal: ${value}`);
  const source = value.slice(1, lastSlash);
  const flags = value.slice(lastSlash + 1);
  return new RegExp(source, flags);
}

export function ensureUniqueNames(items, keyName, label) {
  const seen = new Set();
  const duplicates = [];
  for (const item of items) {
    const key = item[keyName];
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  if (duplicates.length) {
    throw new Error(`${label} has duplicate ${keyName}: ${[...new Set(duplicates)].join(", ")}`);
  }
}

export function updateTemplateForBrazilian(templateList, rawBaseUrl) {
  if (!Array.isArray(templateList) || templateList.length === 0) {
    throw new Error("all-templates.json did not contain a template array.");
  }
  const templates = structuredClone(templateList);
  const template = templates[0];
  const base = rawBaseUrl.replace(/\/$/, "");
  const regexUrl = `${base}/Brazilian/regexes.json`;
  const expressionsUrl = `${base}/Brazilian/expressions.json`;

  template.metadata.id = "brazilian-releases-regex.template";
  template.metadata.name = "Brazilian Releases Regex";
  template.metadata.author = "robertmenezes";
  template.metadata.version = "0.1.1";
  template.metadata.description = "PT-BR-focused variant of Releases-Regex, using English scoring as a base and group data from TRaSH Guides PT-BR. Recognizes Brazilian release groups and PT-BR tags. This initial version does not infer quality tiers from group list order. Requires Stream Expression Score in sort order.";

  const creditsInput = template.metadata.inputs?.find((item) => item.id === "credits");
  if (creditsInput) {
    creditsInput.socials = [
      { id: "github", url: "https://github.com/robertmenezes/releases-regex-ptbr" },
      { id: "github-upstream", url: "https://github.com/Vidhin05/Releases-Regex" },
    ];
  }

  const variantInput = template.metadata.inputs?.find((item) => item.id === "variant");
  if (!variantInput) throw new Error("Could not find the template's variant input.");
  variantInput.name = "Variant";
  variantInput.description = "Choose English, German, Legacy English, or Brazilian (PT-BR focused). The Brazilian variant preserves English scoring and adds Brazilian group/tag recognition.";
  variantInput.options = (variantInput.options ?? []).filter((option) => option.value !== "brazilian");
  variantInput.options.push({ value: "brazilian", label: "Brazilian (PT-BR focused)" });

  const regexSwitch = template.config.rankedRegexPatterns?.__value;
  const regexUrlsSwitch = template.config.syncedRankedRegexUrls;
  const expressionSwitch = template.config.rankedStreamExpressions?.__value;
  const expressionUrlsSwitch = template.config.syncedRankedStreamExpressionUrls;
  if (!regexSwitch?.cases?.english || !expressionSwitch?.cases?.english || !regexUrlsSwitch?.cases || !expressionUrlsSwitch?.cases) {
    throw new Error("Template schema differs from the expected Releases-Regex format.");
  }

  const regexCase = structuredClone(regexSwitch.cases.english);
  regexCase[0] = headerRegexEntry("Brazilian Releases Regexes (synced)");
  regexCase[1] = { pattern: `<SYNCED: ${regexUrl}>`, name: "", score: 0 };
  regexSwitch.cases.brazilian = regexCase;
  regexUrlsSwitch.cases.brazilian = [regexUrl];

  const expressionCase = structuredClone(expressionSwitch.cases.english);
  expressionCase[0] = makeExpression("/*#Brazilian Releases Ranked Stream Expressions (synced)*/ []", 0, true);
  const syncExpressionIndex = expressionCase.findIndex((item) => String(item.expression ?? "").startsWith("<SYNCED:"));
  const syncExpression = makeExpression(`<SYNCED: ${expressionsUrl}>`, 0, true);
  if (syncExpressionIndex >= 0) expressionCase[syncExpressionIndex] = syncExpression;
  else expressionCase.push(syncExpression);
  expressionSwitch.cases.brazilian = expressionCase;
  expressionUrlsSwitch.cases.brazilian = [expressionsUrl];

  return templates;
}
