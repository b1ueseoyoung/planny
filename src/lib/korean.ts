// 한국어 문장을 만들 때 쓰는 작은 도구들

/** 마지막 글자에 받침이 있는지 (한글이 아니면 false) */
export function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

/** 받침에 따라 조사를 붙인다. josa("배달", "이", "가") → "배달이", josa("식사", "이", "가") → "식사가" */
export function josa(word: string, withBatchim: string, without: string): string {
  return word + (hasBatchim(word) ? withBatchim : without);
}
