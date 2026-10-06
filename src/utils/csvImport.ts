import type { Binder, Grading, GradingCompany, PaidPrice } from '@/types/collection';

import type { Condition } from './condition';

export type ImportRow = {
  line: number;
  name: string;
  set: string;
  setCode: string;
  number: string;
  quantity: number;
  variant: string | null;
  condition: Condition;
  paid: PaidPrice | null;
  grading: Grading | null;
  binder: Binder | null;
  language: string;
  sealed: boolean;
};

type Field =
  | 'name'
  | 'simpleName'
  | 'set'
  | 'setCode'
  | 'number'
  | 'quantity'
  | 'printing'
  | 'condition'
  | 'language'
  | 'paid'
  | 'company'
  | 'grade'
  | 'category'
  | 'binder';

const ALIASES: Record<Field, string[]> = {
  name: ['name', 'productname', 'cardname', 'card', 'title', 'item'],
  simpleName: ['simplename'],
  set: ['set', 'setname', 'edition', 'expansion', 'series'],
  setCode: ['setcode', 'code', 'setabbreviation'],
  number: ['cardnumber', 'number', 'collectornumber', 'no', 'num', 'cardno', 'cardnum'],
  quantity: ['quantity', 'qty', 'count', 'addtoquantity', 'totalquantity', 'owned', 'amount', 'copies'],
  printing: ['printing', 'variant', 'variance', 'finish', 'foil', 'version', 'printtype'],
  condition: ['condition', 'cardcondition'],
  language: ['language', 'lang'],
  paid: ['purchaseprice', 'averagecostpaid', 'costpaid', 'pricepaid', 'paid', 'cost', 'buyprice', 'acquisitionprice', 'costbasis'],
  company: ['gradingcompany', 'grader', 'gradedby', 'company'],
  grade: ['grade', 'gradevalue'],
  category: ['category', 'game', 'producttype', 'type', 'producttypename'],
  binder: ['binder', 'list', 'folder', 'portfolio', 'portfolioname', 'collectionname'],
};

const GRADING_COMPANIES: GradingCompany[] = ['PSA', 'BGS', 'CGC', 'TAG'];

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^﻿/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',' || char === ';' || char === '\t') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

export function readImportRows(text: string): { rows: ImportRow[]; recognized: boolean } {
  const table = parseCsv(text);
  const header = table[0] ?? [];
  const columns = detectColumns(header);
  const recognized = columns.name !== undefined || columns.simpleName !== undefined;
  if (!recognized) return { rows: [], recognized };
  const rows: ImportRow[] = [];
  table.slice(1).forEach((cells, index) => {
    const read = (field: Field) => {
      const column = columns[field];
      return column === undefined ? '' : (cells[column] ?? '').trim();
    };
    const name = cleanName(read('simpleName') || read('name'));
    if (!name) return;
    const category = read('category').toLowerCase();
    const language = read('language') || (/japan/i.test(category) ? 'Japanese' : 'English');
    const company = companyOf(read('company') || read('grade'));
    const gradeText = read('grade').replace(/[^0-9.]/g, '');
    rows.push({
      line: index + 2,
      name,
      set: read('set'),
      setCode: read('setCode'),
      number: cleanNumber(read('number')) || numberFromName(read('name')),
      quantity: Math.max(1, Number.parseInt(read('quantity') || '1', 10) || 1),
      variant: variantOf(read('printing'), name),
      condition: conditionOf(read('condition')),
      paid: moneyOf(read('paid')),
      grading: company && gradeText ? { company, grade: gradeText, value: null } : null,
      binder: binderOf(read('binder')),
      language,
      sealed: /sealed|booster|box|bundle|tin|collection|blister|pack/.test(category) && !/single|card/.test(category),
    });
  });
  return { rows, recognized };
}

function detectColumns(header: string[]): Partial<Record<Field, number>> {
  const normalized = header.map((cell) => cell.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const columns: Partial<Record<Field, number>> = {};
  for (const field of Object.keys(ALIASES) as Field[]) {
    for (const alias of ALIASES[field]) {
      const index = normalized.indexOf(alias);
      if (index >= 0 && !Object.values(columns).includes(index)) {
        columns[field] = index;
        break;
      }
    }
  }
  return columns;
}

function cleanName(value: string): string {
  return value.replace(/\s*-\s*\d+\/\d+\s*$/, '').replace(/\s*\((?:reverse holo|holo|1st edition)[^)]*\)\s*$/i, '').trim();
}

function cleanNumber(value: string): string {
  return value.replace(/^#/, '').split('/')[0]?.trim() ?? '';
}

function numberFromName(value: string): string {
  return /(?:^|\s)#?([A-Z]{0,4}\d{1,3})\/\d{1,3}/i.exec(value)?.[1] ?? '';
}

function variantOf(printing: string, name: string): string | null {
  const text = `${printing} ${/\((reverse|holo|1st)/i.test(name) ? name : ''}`.toLowerCase();
  if (!text.trim()) return null;
  if (/reverse/.test(text)) return 'reverseHolofoil';
  if (/1st/.test(text)) return /holo/.test(text) ? '1stEditionHolofoil' : '1stEditionNormal';
  if (/unlimited/.test(text) && /holo/.test(text)) return 'unlimitedHolofoil';
  if (/holo|foil/.test(text) && !/non/.test(text)) return 'holofoil';
  if (/normal|non|regular|standard/.test(text)) return 'normal';
  return null;
}

function conditionOf(value: string): Condition {
  const text = value.toLowerCase();
  if (/damag|poor/.test(text)) return 'DMG';
  if (/heav|^hp/.test(text)) return 'HP';
  if (/moder|^mp|good/.test(text)) return 'MP';
  if (/light|^lp|excellent|^ex/.test(text)) return 'LP';
  return 'NM';
}

function moneyOf(value: string): PaidPrice | null {
  const amount = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? { amount, currency: value.includes('€') ? 'EUR' : 'USD' } : null;
}

function companyOf(value: string): GradingCompany | null {
  const upper = value.toUpperCase();
  return GRADING_COMPANIES.find((company) => upper.includes(company)) ?? null;
}

function binderOf(value: string): Binder | null {
  const text = value.toLowerCase();
  if (/trade/.test(text)) return 'trade';
  if (/sale|sell/.test(text)) return 'sale';
  if (/personal/.test(text)) return 'personal';
  return null;
}
