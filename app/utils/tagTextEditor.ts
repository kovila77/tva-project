import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet } from "@codemirror/view";
import type { TagTextStyleRule } from "~/types/imageTagger";

export interface TokenRange {
  from: number;
  to: number;
  text: string;
}

interface PreparedStyleRule {
  className: string;
  match: TagTextStyleRule["match"];
  tagSet: Set<string>;
  fragments: string[];
  patterns: RegExp[];
  caseSensitive: boolean;
}

export function buildTagTextDecorations(
  documentText: string,
  activeRange: TokenRange | null,
  styleRules: TagTextStyleRule[] | undefined
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const rules = prepareStyleRules(styleRules);

  for (const token of collectTokenRanges(documentText)) {
    for (const rule of rules) {
      addRuleDecorations(ranges, rule, token);
    }

    if (activeRange && token.from === activeRange.from && token.to === activeRange.to) {
      ranges.push(Decoration.mark({ class: "tag-text-selected" }).range(token.from, token.to));
    }
  }

  return Decoration.set(ranges, true);
}

export function collectTokenRanges(text: string): TokenRange[] {
  const tokens: TokenRange[] = [];
  const tokenPattern = /[^,\n]+/g;
  let match: RegExpExecArray | null = tokenPattern.exec(text);

  while (match) {
    const rawToken = match[0];
    const rawFrom = match.index;
    const leadingWhitespace = rawToken.search(/\S/);
    if (leadingWhitespace >= 0) {
      const from = rawFrom + leadingWhitespace;
      const to = rawFrom + rawToken.trimEnd().length;
      if (from < to) {
        tokens.push({ from, to, text: text.slice(from, to) });
      }
    }

    match = tokenPattern.exec(text);
  }

  return tokens;
}

export function getSelectedToken(state: EditorState): string {
  const selection = state.selection.main;
  const documentText = state.doc.toString();

  if (!selection.empty) {
    const selectedText = documentText
      .slice(selection.from, selection.to)
      .replace(/^,\s*/, "")
      .replace(/\s*,?\s*$/, "")
      .trim();

    if (selectedText && !/[,\n]/.test(selectedText)) {
      return selectedText;
    }
  }

  return getActiveTokenRange(state)?.text ?? "";
}

export function getActiveTokenRange(state: EditorState): TokenRange | null {
  const documentText = state.doc.toString();
  const position = state.selection.main.head;
  const left = documentText.slice(0, position);
  const right = documentText.slice(position);
  const start = Math.max(left.lastIndexOf(","), left.lastIndexOf("\n"));
  const commaEnd = right.indexOf(",");
  const lineEnd = right.indexOf("\n");
  const endCandidates = [commaEnd, lineEnd].filter((index) => index >= 0);
  const absoluteStart = start >= 0 ? start + 1 : 0;
  const absoluteEnd = position + (endCandidates.length ? Math.min(...endCandidates) : right.length);
  const rawSegment = documentText.slice(absoluteStart, absoluteEnd);
  const trimmed = rawSegment.trim();

  if (!trimmed) {
    return null;
  }

  const leadingWhitespace = rawSegment.search(/\S/);
  const from = absoluteStart + (leadingWhitespace < 0 ? 0 : leadingWhitespace);
  const to = absoluteStart + rawSegment.trimEnd().length;

  return position >= from && position <= to
    ? { from, to, text: trimmed }
    : null;
}

export function getCompletionToken(text: string, position: number): TokenRange {
  const left = text.slice(0, position);
  const start = Math.max(left.lastIndexOf(","), left.lastIndexOf("\n"));
  const rawFrom = start >= 0 ? start + 1 : 0;
  const prefix = text.slice(rawFrom, position);
  const leadingWhitespace = prefix.search(/\S/);
  const from = rawFrom + (leadingWhitespace < 0 ? prefix.length : leadingWhitespace);

  return {
    from,
    to: position,
    text: text.slice(from, position)
  };
}

export function valueString(value: unknown): string {
  return String(value ?? "");
}

export function normalizeSingleLineValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}

function addRuleDecorations(
  ranges: Range<Decoration>[],
  rule: PreparedStyleRule,
  token: TokenRange
): void {
  if (!rule.className || token.from >= token.to) {
    return;
  }

  if (rule.match === "all-tags") {
    ranges.push(Decoration.mark({ class: rule.className }).range(token.from, token.to));
    return;
  }

  if (rule.match === "tag") {
    const key = normalizeComparable(token.text, rule.caseSensitive);
    if (rule.tagSet.has(key)) {
      ranges.push(Decoration.mark({ class: rule.className }).range(token.from, token.to));
    }
    return;
  }

  if (rule.match === "unmatched-tag") {
    const key = normalizeComparable(token.text, rule.caseSensitive);
    if (rule.tagSet.size > 0 && !rule.tagSet.has(key)) {
      ranges.push(Decoration.mark({ class: rule.className }).range(token.from, token.to));
    }
    return;
  }

  if (rule.match === "fragment") {
    addFragmentDecorations(ranges, rule, token);
    return;
  }

  if (rule.match === "regex") {
    addRegexDecorations(ranges, rule, token);
  }
}

function addFragmentDecorations(
  ranges: Range<Decoration>[],
  rule: PreparedStyleRule,
  token: TokenRange
): void {
  const haystack = rule.caseSensitive ? token.text : token.text.toLowerCase();

  for (const fragment of rule.fragments) {
    let start = 0;
    while (start < haystack.length) {
      const index = haystack.indexOf(fragment, start);
      if (index < 0) {
        break;
      }

      ranges.push(Decoration.mark({ class: rule.className }).range(
        token.from + index,
        token.from + index + fragment.length
      ));
      start = index + Math.max(fragment.length, 1);
    }
  }
}

function addRegexDecorations(
  ranges: Range<Decoration>[],
  rule: PreparedStyleRule,
  token: TokenRange
): void {
  for (const pattern of rule.patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null = pattern.exec(token.text);
    while (match) {
      const text = match[0];
      if (text) {
        ranges.push(Decoration.mark({ class: rule.className }).range(
          token.from + match.index,
          token.from + match.index + text.length
        ));
      }

      pattern.lastIndex = text ? pattern.lastIndex : pattern.lastIndex + 1;
      match = pattern.exec(token.text);
    }
  }
}

function prepareStyleRules(rules: TagTextStyleRule[] | undefined): PreparedStyleRule[] {
  return (rules ?? [])
    .map((rule) => {
      const caseSensitive = Boolean(rule.caseSensitive);
      return {
        className: String(rule.className ?? "").trim(),
        match: rule.match,
        tagSet: new Set((rule.tags ?? [])
          .map((tag) => normalizeComparable(tag, caseSensitive))
          .filter(Boolean)),
        fragments: (rule.fragments ?? [])
          .map((fragment) => normalizeComparable(fragment, caseSensitive))
          .filter(Boolean),
        patterns: compilePatterns(rule.patterns, caseSensitive),
        caseSensitive
      };
    })
    .filter((rule) => rule.className);
}

function compilePatterns(patterns: string[] | undefined, caseSensitive: boolean): RegExp[] {
  const flags = caseSensitive ? "g" : "gi";
  const result: RegExp[] = [];

  for (const pattern of patterns ?? []) {
    try {
      result.push(new RegExp(pattern, flags));
    } catch {
      // Invalid draft regexes are ignored for styling; validation belongs to actions.
    }
  }

  return result;
}

function normalizeComparable(value: unknown, caseSensitive: boolean): string {
  const text = String(value ?? "").trim();
  return caseSensitive ? text : text.toLowerCase();
}
