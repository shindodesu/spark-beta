/**
 * ReFlare バンド生成 - エントリポイント（CLI）
 * 実装計画書 フェーズ3 に基づく。
 */

import * as path from "path";
import { readApplicants, writeBands } from "./csv";
import { getBandSizes } from "./bandComposition";
import { scoreBand } from "./scoring";
import { randomShuffleSearch, localSearch } from "./search";
import type { Applicant, OutputBandRow, Arrangement } from "./types";

const DEFAULT_TRIALS = 50000;

function printUsage(): void {
  console.log(`
ReFlare バンド生成
  入力CSVを読み、スコアに基づいてバンド編成を行い、出力CSVに書き出します。

使い方:
  node dist/main.js <入力CSV> <出力CSV> [オプション]

オプション:
  --trials=N    ランダムシャッフル試行回数（既定: ${DEFAULT_TRIALS}）
  --seed=N      乱数シード（指定時は再現可能な結果）
  --local-search  ローカルサーチで改善を行う（推奨）

例:
  node dist/main.js input/applicants.csv output/bands.csv
  node dist/main.js input/applicants.csv output/bands.csv --trials=10000 --seed=42 --local-search
`);
}

function parseArgs(args: string[]): {
  inputPath: string;
  outputPath: string;
  trials: number;
  seed: number | undefined;
  useLocalSearch: boolean;
} {
  const positional: string[] = [];
  let trials = DEFAULT_TRIALS;
  let seed: number | undefined;
  let useLocalSearch = false;

  for (const arg of args) {
    if (arg.startsWith("--trials=")) {
      const n = parseInt(arg.slice("--trials=".length), 10);
      if (Number.isNaN(n) || n < 1) {
        throw new Error("--trials は正の整数を指定してください。");
      }
      trials = n;
    } else if (arg.startsWith("--seed=")) {
      const n = parseInt(arg.slice("--seed=".length), 10);
      if (Number.isNaN(n)) {
        throw new Error("--seed は整数を指定してください。");
      }
      seed = n;
    } else if (arg === "--local-search") {
      useLocalSearch = true;
    } else if (!arg.startsWith("--")) {
      positional.push(arg);
    }
  }

  if (positional.length < 2) {
    printUsage();
    throw new Error("入力CSVと出力CSVの2つのパスを指定してください。");
  }

  return {
    inputPath: path.resolve(positional[0]),
    outputPath: path.resolve(positional[1]),
    trials,
    seed,
    useLocalSearch,
  };
}

function arrangementToOutputRows(arrangement: Arrangement): OutputBandRow[] {
  return arrangement.map((band, i) => {
    const s = scoreBand(band);
    return {
      band_index: i + 1,
      band_size: band.size,
      band_score_total: s.total,
      score_U: s.U,
      score_E: s.E,
      score_W_part: s.W_part,
      score_W_genre: s.W_genre,
      members: band.members,
    };
  });
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  let opts!: ReturnType<typeof parseArgs>;
  try {
    opts = parseArgs(args);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  let applicants!: Applicant[];
  try {
    applicants = readApplicants(opts.inputPath);
  } catch (e) {
    console.error("入力エラー:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  if (applicants.length < 5) {
    console.error("応募者数が5人未満です。5人以上の入力が必要です。");
    process.exit(1);
  }

  const bandSizes = getBandSizes(applicants.length);
  console.log(`応募者数: ${applicants.length}人, バンド構成: ${bandSizes.join(",")}`);
  console.log(`ランダムシャッフル試行: ${opts.trials}回${opts.seed !== undefined ? ` (シード=${opts.seed})` : ""}`);

  let arrangement!: Arrangement;
  let score!: number;
  try {
    const result = randomShuffleSearch(applicants, opts.trials, opts.seed);
    arrangement = result.arrangement;
    score = result.score;
    console.log(`探索完了。編成スコア: ${score.toFixed(4)}`);
  } catch (e) {
    console.error("探索エラー:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  if (opts.useLocalSearch) {
    console.log("ローカルサーチを実行中...");
    try {
      const result = localSearch(applicants, arrangement, bandSizes);
      if (result.score > score) {
        arrangement = result.arrangement;
        score = result.score;
        console.log(`ローカルサーチで改善。編成スコア: ${score.toFixed(4)}`);
      } else {
        console.log("ローカルサーチで改善なし。");
      }
    } catch (e) {
      console.error("ローカルサーチエラー:", e instanceof Error ? e.message : String(e));
    }
  }

  try {
    const rows = arrangementToOutputRows(arrangement);
    writeBands(opts.outputPath, rows);
    console.log(`出力を書きました: ${opts.outputPath}`);
  } catch (e) {
    console.error("出力エラー:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

main();
