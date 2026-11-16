/**
 * ReFlare バンド生成 - スコア計算（U, E, W_part, W_genre）
 * 要件定義書 §7 に基づく。
 */

import type { Band, BandScore, Arrangement, AssignedMember } from "./types";

function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

/**
 * 1バンドのスコアを計算する。
 * U: (大学の種類数 / 人数) × 3
 * E: s/(1+s) × 2, s = 経験年数の標準偏差
 * W_part: (メンバーごとの加点合計 / 人数) × 2（第1+3, 第2+2, 第3+1）
 * W_genre: (最多希望ジャンルの人数 / 人数) × 1
 */
export function scoreBand(band: Band): BandScore {
  const members = band.members;
  const n = band.size;

  const uniqueUniversities = new Set(members.map((m) => m.applicant.university)).size;
  const U = (uniqueUniversities / n) * 3;

  const expYears = members.map((m) => m.applicant.experience_years);
  const s = standardDeviation(expYears);
  const E = (s / (1 + s)) * 2;

  let partSum = 0;
  for (const m of members) {
    if (m.applicant.first_part === m.assigned_part) partSum += 3;
    else if (m.applicant.second_part === m.assigned_part) partSum += 2;
    else if (m.applicant.third_part === m.assigned_part) partSum += 1;
  }
  const W_part = (partSum / n) * 2;

  const genreCount: Record<string, number> = {};
  for (const m of members) {
    const g = m.applicant.genre;
    genreCount[g] = (genreCount[g] ?? 0) + 1;
  }
  const maxGenreCount = Math.max(0, ...Object.values(genreCount));
  const W_genre = (maxGenreCount / n) * 1;

  const total = U + E + W_part + W_genre;
  return { U, E, W_part, W_genre, total };
}

/**
 * 編成全体のスコア。全バンドがハード制約を満たす場合のみ各バンドのスコアを合計。
 * 制約違反がある編成は呼び出し側でスコア計算対象外とするため、ここでは全バンド有効を前提に合計する。
 */
export function scoreArrangement(arrangement: Arrangement): number {
  let sum = 0;
  for (const band of arrangement) {
    sum += scoreBand(band).total;
  }
  return sum;
}
