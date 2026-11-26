import type { ReactNode } from "react";
import type { SampleLanguage } from "./customerSamples";

// Lexical forms used by the two read-only GET examples.
const patterns = {
  Python: /(?<comment>#[^\r\n]*)|(?<string>f?"(?:\\.|[^"\\\r\n])*"|f?'(?:\\.|[^'\\\r\n])*')|(?<keyword>\b(?:import|from|if|raise|not|in|with|as|for)\b)|(?<literal>\b(?:True|False|None|\d+(?:\.\d+)?)\b)|(?<call>\b[A-Za-z_][A-Za-z0-9_]*(?=[ \t]*\())/g,
  "C#": /(?<comment>\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)|(?<string>\$?"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*')|(?<keyword>\b(?:using|static|string|var|if|throw|new|const|await)\b)|(?<literal>\b(?:true|false|null|\d+(?:\.\d+)?)\b)|(?<call>\b[A-Za-z_][A-Za-z0-9_]*(?=[ \t]*\())/g,
};

export function SampleCode({ text, language }: { text: string; language: SampleLanguage }) {
  const parts: ReactNode[] = [];
  let start = 0;
  for (const match of text.matchAll(patterns[language])) {
    const kind = Object.keys(match.groups!).find(name => match.groups![name] !== undefined);
    parts.push(text.slice(start, match.index), <span className={`sample-${kind}`} key={match.index}>{match[0]}</span>);
    start = match.index + match[0].length;
  }
  return <code>{parts}{text.slice(start)}</code>;
}
