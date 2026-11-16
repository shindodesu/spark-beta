/**
 * ReFlare バンド生成 - ランダムシャッフル多回試行・ローカルサーチ
 * 要件定義書 §5.2 に基づく。
 */

import type { Applicant, Arrangement, Band, BandSizes } from "./types";
import { getBandSizes, splitIntoBands } from "./bandComposition";
import { assignPartsForBand } from "./partAssignment";
import { scoreArrangement, scoreBand } from "./scoring";
import { isArrangementValid } from "./constraints";

/** シード付き乱数生成（再現性用） */
function createSeededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
}

/** Fisher-Yates シャッフル */
function shuffle<T>(arr: T[], random: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 応募者リストを順列で並べ、バンドサイズに従って分割し、
 * 各バンドにパート割り当てを行った編成を返す。
 * いずれかのバンドで希望パート制約を満たす割り当てが存在しない場合は null。
 */
function buildArrangement(
  applicants: Applicant[],
  order: Applicant[],
  bandSizes: BandSizes
): Arrangement | null {
  const bandsMembers = splitIntoBands(order, bandSizes);
  const bands: Band[] = [];
  for (const members of bandsMembers) {
    const assigned = assignPartsForBand(members);
    if (assigned === null) return null;
    bands.push({ members: assigned, size: assigned.length });
  }
  return bands;
}

/**
 * ランダムシャッフルを所定回数試行し、ハード制約を満たす編成のうち
 * スコアが最大の編成を返す。
 */
export function randomShuffleSearch(
  applicants: Applicant[],
  trials: number,
  seed?: number
): { arrangement: Arrangement; score: number } {
  const bandSizes = getBandSizes(applicants.length);
  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;

  let bestArrangement: Arrangement | null = null;
  let bestScore = -Infinity;
  let validCount = 0;

  for (let t = 0; t < trials; t++) {
    const order = shuffle(applicants, random);
    const arrangement = buildArrangement(applicants, order, bandSizes);
    if (arrangement === null || !isArrangementValid(arrangement)) continue;
    validCount++;
    const score = scoreArrangement(arrangement);
    if (score > bestScore) {
      bestScore = score;
      bestArrangement = arrangement;
    }
  }

  if (bestArrangement === null) {
    throw new Error(
      `指定回数（${trials}回）の試行のうち、ハード制約を満たす編成が1件も得られませんでした。試行回数を増やすか、入力データを確認してください。`
    );
  }

  return { arrangement: bestArrangement, score: bestScore };
}

/**
 * 編成のディープコピー（メンバー参照は同じ applicant を共有）
 */
function copyArrangement(arr: Arrangement): Arrangement {
  return arr.map((band) => ({
    members: band.members.map((m) => ({ applicant: m.applicant, assigned_part: m.assigned_part })),
    size: band.size,
  }));
}

/**
 * 2バンド間でメンバーを1人ずつ入れ替えた新しい編成を返す。
 * 入れ替え後はパート割り当てをやり直す。
 */
function swapMembers(
  applicants: Applicant[],
  arrangement: Arrangement,
  bandSizes: BandSizes,
  bandA: number,
  indexA: number,
  bandB: number,
  indexB: number
): Arrangement | null {
  const order: Applicant[] = [];
  for (const band of arrangement) {
    for (const m of band.members) {
      order.push(m.applicant);
    }
  }
  const posA = bandSizes.slice(0, bandA).reduce((a, b) => a + b, 0) + indexA;
  const posB = bandSizes.slice(0, bandB).reduce((a, b) => a + b, 0) + indexB;
  [order[posA], order[posB]] = [order[posB], order[posA]];
  return buildArrangement(applicants, order, bandSizes);
}

/**
 * 最良編成を初期解に、異なるバンド間でメンバーを1人ずつ入れ替え、
 * スコアが改善するなら採用する操作を繰り返す。
 */
export function localSearch(
  applicants: Applicant[],
  initialArrangement: Arrangement,
  bandSizes: BandSizes
): { arrangement: Arrangement; score: number } {
  let current = copyArrangement(initialArrangement);
  let currentScore = scoreArrangement(current);

  for (;;) {
    let improved = false;
    for (let a = 0; a < current.length; a++) {
      for (let b = a + 1; b < current.length; b++) {
        for (let i = 0; i < current[a].members.length; i++) {
          for (let j = 0; j < current[b].members.length; j++) {
            const next = swapMembers(applicants, current, bandSizes, a, i, b, j);
            if (next === null || !isArrangementValid(next)) continue;
            const nextScore = scoreArrangement(next);
            if (nextScore > currentScore) {
              current = next;
              currentScore = nextScore;
              improved = true;
              break;
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) break;
    }
    if (!improved) break;
  }

  return { arrangement: current, score: currentScore };
}
