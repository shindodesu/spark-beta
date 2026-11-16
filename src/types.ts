/**
 * ReFlare バンド生成 - 型定義
 * 要件定義書 §2（入力仕様）, §3（出力仕様）に基づく。
 */

/** パートの取り得る値（要件 §2.2） */
export type Part = "Lead" | "1st" | "2nd" | "3rd" | "Bass" | "Perc.";

/** 6人バンドで必要な全パート（Perc. 含む） */
export const ALL_PARTS_6: Part[] = ["Lead", "1st", "2nd", "3rd", "Bass", "Perc."];

/** 5人バンドで必要なパート（Perc. なし） */
export const ALL_PARTS_5: Part[] = ["Lead", "1st", "2nd", "3rd", "Bass"];

/** 応募者1件（入力CSVの1行に相当） */
export interface Applicant {
  id: string;
  name: string;
  university: string;
  experience_years: number;
  first_part: Part;
  /** 第2希望パート（空欄の場合もある） */
  second_part: Part | null;
  /** 第3希望パート（空欄の場合もある） */
  third_part: Part | null;
  can_arrange: "はい" | "いいえ";
  genre: string;
}

/** 割り当て済みメンバー（パートが決まった応募者） */
export interface AssignedMember {
  applicant: Applicant;
  assigned_part: Part;
}

/** 1バンド（パート割り当て済み） */
export interface Band {
  members: AssignedMember[];
  /** バンド人数 5 または 6 */
  size: number;
}

/** 編成（複数バンドの配列。応募者順列から分割した結果） */
export type Arrangement = Band[];

/** 編成のスコア内訳（1バンド分） */
export interface BandScore {
  U: number;
  E: number;
  W_part: number;
  W_genre: number;
  total: number;
}

/** 出力CSVの1行（1バンド分）に相当するデータ */
export interface OutputBandRow {
  band_index: number;
  band_size: number;
  band_score_total: number;
  score_U: number;
  score_E: number;
  score_W_part: number;
  score_W_genre: number;
  members: AssignedMember[];
}

/** バンドサイズの配列（例: [6,6,6,6,5,5]） */
export type BandSizes = number[];
