/**
 * ReFlare バンド生成 - CSV 読み込み・書き出し
 * 要件定義書 §2（入力）, §3（出力）に基づく。
 */

import * as fs from "fs";
import * as path from "path";
import type { Applicant, Part, OutputBandRow } from "./types";

const REQUIRED_COLUMNS = [
  "id",
  "name",
  "university",
  "experience_years",
  "first_part",
  "second_part",
  "third_part",
  "can_arrange",
  "genre",
] as const;

const VALID_PARTS: Part[] = ["Lead", "1st", "2nd", "3rd", "Bass", "Perc."];
const VALID_CAN_ARRANGE = ["はい", "いいえ"] as const;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parsePart(value: string): Part {
  const v = value.trim();
  if (VALID_PARTS.includes(v as Part)) return v as Part;
  throw new Error(`無効なパート: "${value}"。Lead, 1st, 2nd, 3rd, Bass, Perc. のいずれかを指定してください。`);
}

/** 第2・第3希望など、空欄も許容するパートパーサー */
function parseOptionalPart(value: string): Part | null {
  const v = value.trim();
  if (v === "") return null;
  return parsePart(v);
}

/**
 * 入力CSVを読み、応募者リストを返す。バリデーション付き。
 */
export function readApplicants(filePath: string): Applicant[] {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`入力ファイルが見つかりません: ${filePath}`);
  }
  const content = fs.readFileSync(resolved, "utf-8");
  const lines = content.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSVにヘッダー行と少なくとも1行のデータが必要です。");
  }

  const header = parseCsvLine(lines[0]);
  const colIndex: Record<string, number> = {};
  for (let i = 0; i < header.length; i++) {
    colIndex[header[i].trim()] = i;
  }

  for (const col of REQUIRED_COLUMNS) {
    if (colIndex[col] === undefined) {
      throw new Error(`必須列がありません: "${col}"。入力CSVの列名を確認してください。`);
    }
  }

  const applicants: Applicant[] = [];
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
    const cells = parseCsvLine(lines[rowIndex]);
    const get = (col: string): string => {
      const i = colIndex[col];
      return i !== undefined ? (cells[i] ?? "").trim() : "";
    };

    const experienceYearsStr = get("experience_years");
    const experienceYears = parseInt(experienceYearsStr, 10);
    if (Number.isNaN(experienceYears) || experienceYears < 0) {
      throw new Error(
        `${rowIndex + 1}行目: experience_years は0以上の数値である必要があります（値: "${experienceYearsStr}"）。`
      );
    }

    const canArrange = get("can_arrange");
    if (!VALID_CAN_ARRANGE.includes(canArrange as "はい" | "いいえ")) {
      throw new Error(
        `${rowIndex + 1}行目: can_arrange は「はい」または「いいえ」である必要があります（値: "${canArrange}"）。`
      );
    }

    try {
      applicants.push({
        id: get("id"),
        name: get("name"),
        university: get("university"),
        experience_years: experienceYears,
        first_part: parsePart(get("first_part")),
        second_part: parseOptionalPart(get("second_part")),
        third_part: parseOptionalPart(get("third_part")),
        can_arrange: canArrange as "はい" | "いいえ",
        genre: get("genre"),
      });
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(`${rowIndex + 1}行目: ${e.message}`);
      }
      throw e;
    }
  }

  return applicants;
}

/** 出力CSVの先頭に載せる説明文（アルゴリズムの概要・開発の思い・Spark β について） */
const OUTPUT_DESCRIPTION = [
  "この編成は、「なるべく多様な仲間と一緒に、みんなが楽しめるバンドを」という思いで作られています。",
  "大学や経験年数がバラけるようにしつつ、希望パートやジャンルの相性もなるべく叶えるように、スコア計算をして自動で編成しています。",
  "編成ロジックは Spark β（https://github.com/shindodesu/spark-beta）を使っています。",
].join(" ");

/**
 * 編成結果（出力用の行リスト）をCSVに書き出す。1バンド1行。メンバーは「氏名(担当パート)」で記述。
 * 先頭に説明列を設け、1行目にアルゴリズム・開発の思いなどの説明文を記載する。
 */
export function writeBands(filePath: string, rows: OutputBandRow[]): void {
  const dataHeaders = [
    "band_index",
    "band_size",
    "band_score_total",
    "score_U",
    "score_E",
    "score_W_part",
    "score_W_genre",
    "member_assignments",
  ];
  const headers = ["説明", ...dataHeaders];
  const lines: string[] = [
    headers.map(escapeCsvCell).join(","),
    [escapeCsvCell(OUTPUT_DESCRIPTION), ...dataHeaders.map(() => "")].join(","),
  ];

  for (const row of rows) {
    const memberAssignments = row.members
      .map((m) => `${m.applicant.name}(${m.assigned_part})`)
      .join("、");
    const cells: string[] = [
      "",
      String(row.band_index),
      String(row.band_size),
      String(row.band_score_total),
      String(row.score_U),
      String(row.score_E),
      String(row.score_W_part),
      String(row.score_W_genre),
      memberAssignments,
    ];
    lines.push(cells.map(escapeCsvCell).join(","));
  }

  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(resolved, lines.join("\n"), "utf-8");
}
