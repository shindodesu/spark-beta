/**
 * ReFlare バンド生成 - バンド数・各バンド人数の決定、順列からバンド分割
 * 要件定義書 §4 に基づく。
 */

import type { Applicant, BandSizes } from "./types";

/**
 * 応募者数 N から、6人バンドを優先し、余りは最後の数バンドを5人にする。
 * 5人未満のバンドは作らない。
 * 例: 34人 → [6,6,6,6,5,5]
 */
export function getBandSizes(totalCount: number): BandSizes {
  if (totalCount < 5) {
    throw new Error(`応募者数が少なすぎます（${totalCount}人）。5人以上の必要があります。`);
  }
  const sizes: number[] = [];
  let remaining = totalCount;
  while (remaining >= 6) {
    sizes.push(6);
    remaining -= 6;
  }
  // remaining は 0〜5
  if (remaining > 0) {
    // 5人未満のバンドは作らない → 最後の6人バンドを5人にし、余りを吸収
    if (remaining >= 5) {
      sizes.push(5);
      remaining -= 5;
    } else {
      // remaining が 1〜4: 最後の6人バンドを5人にすると (6-5)+remaining = 1+remaining 人あまる
      // その人数で新バンドが5人以上になるまで、6人バンドを5人に変える
      let needToConvert = 5 - remaining; // 5人バンド1つ作るためにあと何人必要か
      while (needToConvert > 0 && sizes.length > 0 && sizes[sizes.length - 1] === 6) {
        sizes[sizes.length - 1] = 5;
        needToConvert -= 1;
        remaining += 1;
      }
      if (remaining >= 5) {
        sizes.push(5);
        remaining -= 5;
      }
      // まだ余りがある場合はさらに繰り返す（理論上は 5 未満にならないように調整済み）
      while (remaining >= 5) {
        sizes.push(5);
        remaining -= 5;
      }
    }
  }
  if (remaining > 0) {
    throw new Error(
      `応募者数 ${totalCount} で5人/6人バンドに割り切れません。調整ロジックで余りが発生しました（${remaining}人）。`
    );
  }
  return sizes;
}

/**
 * 応募者順列（インデックス配列または応募者配列）とバンドサイズ配列から、
 * バンドごとの応募者リストの配列を生成する。
 */
export function splitIntoBands<T>(permutation: T[], bandSizes: BandSizes): T[][] {
  const bands: T[][] = [];
  let offset = 0;
  for (const size of bandSizes) {
    bands.push(permutation.slice(offset, offset + size));
    offset += size;
  }
  if (offset !== permutation.length) {
    throw new Error(
      `splitIntoBands: 順列長 ${permutation.length} とバンドサイズ合計 ${offset} が一致しません。`
    );
  }
  return bands;
}
