/**
 * ReFlare バンド生成 - ハード制約チェック
 * 要件定義書 §8 に基づく。
 */

import type { Band, Arrangement } from "./types";

/**
 * 1バンドがハード制約を満たすか。
 * (1) アレンジャーが最低1人 (2) 5人バンドにPerc.がいない (3) 希望外パートの割り当てがない
 */
export function isBandValid(band: Band): boolean {
  const members = band.members;
  const n = band.size;

  const hasArranger = members.some((m) => m.applicant.can_arrange === "はい");
  if (!hasArranger) return false;

  if (n === 5) {
    const hasPerc = members.some((m) => m.assigned_part === "Perc.");
    if (hasPerc) return false;
  }

  for (const m of members) {
    const part = m.assigned_part;
    const allowed =
      part === m.applicant.first_part ||
      part === m.applicant.second_part ||
      part === m.applicant.third_part;
    if (!allowed) return false;
  }

  return true;
}

/**
 * 編成全体がハード制約を満たすか。1つでも違反バンドがあれば false。
 */
export function isArrangementValid(arrangement: Arrangement): boolean {
  for (const band of arrangement) {
    if (!isBandValid(band)) return false;
  }
  return true;
}
