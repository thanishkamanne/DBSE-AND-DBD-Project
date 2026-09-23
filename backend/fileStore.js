import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, './data');
const DATA_FILE = path.resolve(DATA_DIR, 'db.json');

function getInitialData() {
  return {
    users: [],
    otp_verifications: [],
    emergency_contacts: [],
    sos_incidents: [],
    sos_notifications: [],
    check_ins: [],
    safety_zones: [],
    evidence_logs: [],
    evidence_records: [],
    alerts: [],
    user_alerts: [],
    network_members: [],
    counters: {
      users: 1,
      otp_verifications: 1,
      emergency_contacts: 1,
      sos_incidents: 1,
      sos_notifications: 1,
      check_ins: 1,
      safety_zones: 1,
      evidence_logs: 1,
      evidence_records: 1,
      alerts: 1,
      user_alerts: 1,
      network_members: 1,
    },
  };
}

function readData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const init = getInitialData();
      fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2), 'utf-8');
      return init;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const initial = getInitialData();
    for (const key of Object.keys(initial)) {
      if (data[key] === undefined) {
        data[key] = initial[key];
      }
    }
    if (!data.counters) {
      data.counters = initial.counters;
    } else {
      for (const cKey of Object.keys(initial.counters)) {
        if (data.counters[cKey] === undefined) {
          data.counters[cKey] = 1;
        }
      }
    }
    return data;
  } catch (err) {
    console.error('[FileStore] Read error:', err.message);
    return getInitialData();
  }
}

function writeData(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[FileStore] Write error:', err.message);
  }
}

/**
 * Executes a simplified SQL statement on the file-backed JSON database
 */
export async function executeFileQuery(sql, params = []) {
  const data = readData();
  const trimmed = sql.trim().replace(/\s+/g, ' ');
  const upper = trimmed.toUpperCase();

  // 1. DDL Statements (CREATE TABLE, ALTER TABLE, etc.)
  if (
    upper.startsWith('CREATE TABLE') ||
    upper.startsWith('ALTER TABLE') ||
    upper.startsWith('DROP TABLE')
  ) {
    return [{}, []];
  }

  // 2. INSERT INTO <table> (cols...) VALUES (...)
  const insertMatch = trimmed.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const table = insertMatch[1].toLowerCase();
    if (!data[table]) data[table] = [];
    if (!data.counters[table]) data.counters[table] = 1;

    const cols = insertMatch[2].split(',').map((c) => c.trim().toLowerCase());
    const valExprs = insertMatch[3].split(',').map((v) => v.trim());
    const newId = data.counters[table]++;
    const now = new Date().toISOString();

    const row = {
      id: newId,
      created_at: now,
      updated_at: now,
    };

    let paramIdx = 0;
    cols.forEach((col, idx) => {
      const expr = valExprs[idx];
      if (expr === '?') {
        row[col] = params[paramIdx++] !== undefined ? params[paramIdx - 1] : null;
      } else if (expr && expr.startsWith("'") && expr.endsWith("'")) {
        row[col] = expr.slice(1, -1);
      } else if (expr && (expr.toUpperCase() === 'CURRENT_TIMESTAMP' || expr.toUpperCase() === 'NOW()')) {
        row[col] = now;
      } else if (expr && expr.toUpperCase() === 'NULL') {
        row[col] = null;
      } else if (expr && !isNaN(Number(expr))) {
        row[col] = Number(expr);
      } else {
        row[col] = params[paramIdx++] !== undefined ? params[paramIdx - 1] : null;
      }
    });

    data[table].push(row);
    writeData(data);

    return [{ insertId: newId, affectedRows: 1 }, []];
  }

  // 3. DELETE FROM <table> WHERE ...
  const deleteMatch = trimmed.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?/i);
  if (deleteMatch) {
    const table = deleteMatch[1].toLowerCase();
    const whereClause = deleteMatch[2];
    if (!data[table]) {
      return [{ affectedRows: 0 }, []];
    }

    const beforeCount = data[table].length;
    data[table] = data[table].filter((row) => {
      return !matchWhere(row, whereClause, params);
    });

    const affectedRows = beforeCount - data[table].length;
    writeData(data);
    return [{ affectedRows }, []];
  }

  // 4. UPDATE <table> SET col1 = ?, col2 = ? WHERE ...
  const updateMatch = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
  if (updateMatch) {
    const table = updateMatch[1].toLowerCase();
    const setClause = updateMatch[2];
    const whereClause = updateMatch[3];

    if (!data[table]) {
      return [{ affectedRows: 0 }, []];
    }

    const setParts = setClause.split(',').map((p) => p.trim());
    const now = new Date().toISOString();
    const setOperations = setParts.map((p) => {
      const eqIdx = p.indexOf('=');
      const col = p.slice(0, eqIdx).trim().toLowerCase();
      const valRaw = p.slice(eqIdx + 1).trim();

      return { col, valRaw };
    });
    const setParamCount = (setClause.match(/\?/g) || []).length;
    const whereParams = params.slice(setParamCount);

    let affectedRows = 0;

    data[table] = data[table].map((row) => {
      if (matchWhere(row, whereClause, whereParams)) {
        affectedRows++;
        let pIdx = 0;
        const updated = { ...row, updated_at: now };
        setOperations.forEach(({ col, valRaw }) => {
          let val;
          if (valRaw === '?') {
            val = params[pIdx++];
          } else if (valRaw && valRaw.startsWith("'") && valRaw.endsWith("'")) {
            val = valRaw.slice(1, -1);
          } else if (valRaw && (valRaw.toUpperCase() === 'CURRENT_TIMESTAMP' || valRaw.toUpperCase() === 'NOW()')) {
            val = now;
          } else if (valRaw && valRaw.toUpperCase() === 'NULL') {
            val = null;
          } else if (valRaw && valRaw.toLowerCase().includes('+')) {
            const addParts = valRaw.split('+').map((s) => s.trim());
            const addend = Number(addParts[1]) || 1;
            val = (Number(row[col]) || 0) + addend;
          } else if (valRaw && !isNaN(Number(valRaw))) {
            val = Number(valRaw);
          } else {
            val = params[pIdx++];
          }
          updated[col] = val !== undefined ? val : null;
        });
        return updated;
      }
      return row;
    });

    writeData(data);
    return [{ affectedRows }, []];
  }

  // 5. SELECT cols FROM <table> [WHERE ...] [ORDER BY ...] [LIMIT ...]
  const selectMatch = trimmed.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
  if (selectMatch) {
    const colList = selectMatch[1].trim();
    const table = selectMatch[2].toLowerCase();
    const whereClause = selectMatch[3];
    const orderByClause = selectMatch[4];
    const limitClause = selectMatch[5];

    let rows = data[table] ? [...data[table]] : [];

    // Filter by WHERE
    if (whereClause) {
      rows = rows.filter((row) => matchWhere(row, whereClause, params));
    }

    // Handle COUNT(*)
    if (colList.toUpperCase().includes('COUNT(')) {
      return [[{ count: rows.length, 'COUNT(*)': rows.length, total: rows.length }], []];
    }

    // Handle ORDER BY
    if (orderByClause) {
      const orderParts = orderByClause.split(',').map((p) => p.trim());
      rows.sort((a, b) => {
        for (const part of orderParts) {
          const [colRaw, dir] = part.split(/\s+/);
          const col = colRaw.toLowerCase();
          const isDesc = dir && dir.toUpperCase() === 'DESC';
          if (a[col] < b[col]) return isDesc ? 1 : -1;
          if (a[col] > b[col]) return isDesc ? -1 : 1;
        }
        return 0;
      });
    }

    // Handle LIMIT
    if (limitClause) {
      const limit = parseInt(limitClause, 10);
      if (!isNaN(limit)) {
        rows = rows.slice(0, limit);
      }
    }

    return [rows, []];
  }

  return [[], []];
}

/**
 * Evaluates a single predicate (e.g. col = __PARAM_0__, col != 5, col IS NULL)
 */
function evaluatePredicate(row, predicate, paramMap) {
  const p = predicate.trim();
  if (!p) return true;

  // col IS NULL
  const isNullMatch = p.match(/^([a-zA-Z0-9_]+)\s+IS\s+NULL$/i);
  if (isNullMatch) {
    const col = isNullMatch[1].toLowerCase();
    const val = row[col];
    return val === null || val === undefined;
  }

  // col IS NOT NULL
  const isNotNullMatch = p.match(/^([a-zA-Z0-9_]+)\s+IS\s+NOT\s+NULL$/i);
  if (isNotNullMatch) {
    const col = isNotNullMatch[1].toLowerCase();
    const val = row[col];
    return val !== null && val !== undefined;
  }

  // col = __PARAM_X__ or col != __PARAM_X__ or col <> __PARAM_X__
  const paramMatch = p.match(/^([a-zA-Z0-9_]+)\s*(=|!=|<>)\s*__PARAM_(\d+)__$/i);
  if (paramMatch) {
    const col = paramMatch[1].toLowerCase();
    const op = paramMatch[2];
    const pIdx = parseInt(paramMatch[3], 10);
    const expected = paramMap[pIdx];
    const actual = row[col];

    if (expected === null || expected === undefined) {
      return op === '=' ? (actual === null || actual === undefined) : (actual !== null && actual !== undefined);
    }

    // Loose equality for strings/numbers (case-insensitive for strings)
    let matches = false;
    if (typeof expected === 'string' && typeof actual === 'string') {
      matches = expected.trim().toLowerCase() === actual.trim().toLowerCase();
    } else {
      matches = actual == expected;
    }

    return op === '=' ? matches : !matches;
  }

  // col = 'literal' or col != 'literal'
  const strMatch = p.match(/^([a-zA-Z0-9_]+)\s*(=|!=|<>)\s*['"]([^'"]*)['"]$/i);
  if (strMatch) {
    const col = strMatch[1].toLowerCase();
    const op = strMatch[2];
    const expected = strMatch[3];
    const actual = row[col];
    const matches = typeof actual === 'string'
      ? actual.trim().toLowerCase() === expected.trim().toLowerCase()
      : actual == expected;
    return op === '=' ? matches : !matches;
  }

  // col = 123 or col != 123
  const numMatch = p.match(/^([a-zA-Z0-9_]+)\s*(=|!=|<>)\s*(-?\d+(?:\.\d+)?)$/i);
  if (numMatch) {
    const col = numMatch[1].toLowerCase();
    const op = numMatch[2];
    const expected = Number(numMatch[3]);
    const actual = Number(row[col]);
    const matches = actual === expected;
    return op === '=' ? matches : !matches;
  }

  return true;
}

/**
 * Matches a row against simplified WHERE clauses supporting AND and OR
 */
function matchWhere(row, whereClause, params = []) {
  if (!whereClause || !whereClause.trim()) return true;

  // Substitute each ? with an index placeholder __PARAM_0__, __PARAM_1__, etc.
  let pCounter = 0;
  const preparedWhere = whereClause.trim().replace(/\?/g, () => `__PARAM_${pCounter++}__`);

  // Handle top-level OR clauses: e.g. "email = ? OR phone = ?"
  if (/\s+OR\s+/i.test(preparedWhere)) {
    const orBranches = preparedWhere.split(/\s+OR\s+/i);
    return orBranches.some((branch) => {
      const andConditions = branch.trim().split(/\s+AND\s+/i);
      return andConditions.every((cond) => evaluatePredicate(row, cond, params));
    });
  }

  // Standard AND conditions
  const andConditions = preparedWhere.split(/\s+AND\s+/i);
  return andConditions.every((cond) => evaluatePredicate(row, cond, params));
}
