/**
 * ReFlare バンド生成 - バンド内パート割り当て最適化
 * 要件定義書 §6: 希望パート制約を満たす割り当てのうち W_part が最大となる割り当てを採用。
 */

import type { Applicant, Part, AssignedMember } from "./types";
import { ALL_PARTS_5, ALL_PARTS_6 } from "./types";

/** メンバーと割り当てパートに対する希望加点（第1+3, 第2+2, 第3+1） */
function hopeScore(applicant: Applicant, part: Part): number {
  if (applicant.first_part === part) return 3;
  if (applicant.second_part === part) return 2;
  if (applicant.third_part === part) return 1;
  return -1; // 希望外は割り当て不可
}

/** 配列の全順列を生成（インデックスの順列） */
function permutations(n: number): number[][] {
  const arr = Array.from({ length: n }, (_, i) => i);
  const result: number[][] = [];
  function permute(start: number) {
    if (start === n - 1) {
      result.push([...arr]);
      return;
    }
    for (let i = start; i < n; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      permute(start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  }
  permute(0);
  return result;
}

/**
 * 1バンド分のメンバー（応募者リスト）に対して、希望パート制約を満たし
 * W_part が最大となるパート割り当てを求め、AssignedMember[] を返す。
 * 5人バンドの場合は Perc. は使わない（ALL_PARTS_5）。
 */
export function assignPartsForBand(members: Applicant[]): AssignedMember[] | null {
  const n = members.length;
  const parts: Part[] = n === 6 ? [...ALL_PARTS_6] : [...ALL_PARTS_5];
  if (parts.length !== n) {
    throw new Error(`assignPartsForBand: メンバー数 ${n} とパート数 ${parts.length} が一致しません。`);
  }

  const perms = permutations(n);
  let bestAssignment: Part[] | null = null;
  let bestWPart = -1;

  for (const perm of perms) {
    // メンバー i に パート parts[perm[i]] を割り当てる
    let valid = true;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const part = parts[perm[i]];
      const score = hopeScore(members[i], part);
      if (score < 0) {
        valid = false;
        break;
      }
      sum += score;
    }
    if (!valid) continue;
    const wPart = (sum / n) * 2;
    if (wPart > bestWPart) {
      bestWPart = wPart;
      bestAssignment = perm.map((pi) => parts[pi]);
    }
  }

  if (bestAssignment === null) {
    return null;
  }

  return members.map((applicant, i) => ({
    applicant,
    assigned_part: bestAssignment![i],
  }));
}
