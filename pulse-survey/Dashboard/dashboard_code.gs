// ─── CONFIG ───────────────────────────────────────────────────────────────────

const SS_ID            = '1QeIYqGnBUdUuWRmqKaemxmb3Q6OSQFUnhK3wdax9e6E';
const RESPONSES_SHEET  = 'Responses';
const QUESTIONS_SHEET  = 'Questions';
const EMPLOYEES_SHEET  = 'Employees';
const DRAFTS_SHEET     = 'Drafts';
const SETTINGS_SHEET   = 'Settings';

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

function doGet() {
  return HtmlService.createHtmlOutputFromFile('dashboard')
    .setTitle('Pulse Survey Analytics')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── MAIN DATA FUNCTION (called from client) ──────────────────────────────────

function getDashboardData(filters) {
  filters = filters || {};
  const ss = SpreadsheetApp.openById(SS_ID);

  const settings  = readSettings(ss);
  const year      = settings.surveyYear;
  const questions = readQuestions(ss);
  const employees = readEmployees(ss);
  const responses = readResponses(ss, year, questions);
  const drafts    = readDrafts(ss, year);

  // ── Filter options (always from full unfiltered data) ─────────────────────

  const filterOptions = {
    departments: [...new Set(employees.all.map(e => e.newDepartment).filter(v => v))].sort(),
    regions:     [...new Set(employees.all.map(e => e.region).filter(v => v))].sort(),
    tenures:     [...new Set(employees.all.map(e => e.tenure).filter(v => v))].sort(),
    genders:     [...new Set(employees.all.map(e => e.gender).filter(v => v))].sort(),
  };

  // ── Apply filters ─────────────────────────────────────────────────────────

  let filteredEmps = employees.all;
  if (filters.dept   && filters.dept   !== 'all') filteredEmps = filteredEmps.filter(e => e.newDepartment === filters.dept);
  if (filters.region && filters.region !== 'all') filteredEmps = filteredEmps.filter(e => e.region        === filters.region);
  if (filters.tenure && filters.tenure !== 'all') filteredEmps = filteredEmps.filter(e => e.tenure        === filters.tenure);
  if (filters.gender && filters.gender !== 'all') filteredEmps = filteredEmps.filter(e => e.gender        === filters.gender);

  let filteredRows = responses.rows;
  if (filters.dept   && filters.dept   !== 'all') filteredRows = filteredRows.filter(r => r.demographics['New Department'] === filters.dept);
  if (filters.region && filters.region !== 'all') filteredRows = filteredRows.filter(r => r.demographics['Region']         === filters.region);
  if (filters.tenure && filters.tenure !== 'all') filteredRows = filteredRows.filter(r => r.demographics['Tenure Band']    === filters.tenure);
  if (filters.gender && filters.gender !== 'all') filteredRows = filteredRows.filter(r => r.demographics['Gender']         === filters.gender);

  // ── Top-line KPIs ──────────────────────────────────────────────────────────

  const totalEligible  = filteredEmps.length;
  const totalSubmitted = filteredRows.length;
  const draftCount     = drafts;

  // eNPS
  const enpsRows = filteredRows.map(r => r.answers['enps_enps_1']).filter(v => v !== '' && v !== null && !isNaN(v));
  const enps = computeEnps(enpsRows);

  // Wellbeing
  const wbRows = filteredRows.map(r => r.answers['wel_wellbeing_1']).filter(v => v !== '' && v !== null && !isNaN(v));
  const wellbeing = wbRows.length ? round1(wbRows.reduce((a, b) => a + Number(b), 0) / wbRows.length) : null;

  // Intention to Stay
  const itsRows = filteredRows.map(r => r.answers['its_stay_2']).filter(v => v !== '' && v !== null);
  const intentionToStay = computeIts(itsRows);

  // ── Dimension & Focus Area scores ──────────────────────────────────────────

  const { dimensionScores, focusAreaScores } = computeDimensionScores(filteredRows, questions);

  // ── Cohort breakdowns ──────────────────────────────────────────────────────

  const cohortDefs = [
    { key: 'newDepartment', empField: 'newDepartment', respField: 'New Department' },
    { key: 'division',      empField: 'division',      respField: 'Division'      },
    { key: 'tenure',        empField: 'tenure',        respField: 'Tenure Band'   },
    { key: 'region',        empField: 'region',        respField: 'Region'        },
    { key: 'gender',        empField: 'gender',        respField: 'Gender'        },
    { key: 'age',           empField: 'age',           respField: 'Age'           },
  ];

  const cohorts = {};
  cohortDefs.forEach(({ key, empField, respField }) => {
    cohorts[key] = computeCohortBreakdown(filteredEmps, filteredRows, empField, respField, questions);
  });

  // Department → Division drilldown (uses filtered data)
  const departmentDrilldown = {};
  const deptNames = [...new Set(filteredEmps.map(e => e.newDepartment).filter(v => v))].sort();
  deptNames.forEach(dept => {
    const deptEmps = filteredEmps.filter(e => e.newDepartment === dept);
    const deptRows = filteredRows.filter(r => r.demographics['New Department'] === dept);
    departmentDrilldown[dept] = computeCohortBreakdown(deptEmps, deptRows, 'division', 'Division', questions);
  });

  return {
    year,
    surveyOpen:    settings.surveyOpen,
    totalEligible,
    totalSubmitted,
    drafts:        draftCount,
    enps,
    wellbeing,
    intentionToStay,
    dimensionScores,
    focusAreaScores,
    cohorts,
    departmentDrilldown,
    filterOptions,
  };
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

function readSettings(ss) {
  const data = ss.getSheetByName(SETTINGS_SHEET).getDataRange().getValues();
  const map = {};
  data.forEach(row => { if (row[0]) map[row[0].toString().trim()] = row[1]; });
  return {
    surveyYear: map['Survey Year'] ? parseInt(map['Survey Year']) : new Date().getFullYear(),
    surveyOpen: map['Survey Open'] ? map['Survey Open'].toString().trim().toLowerCase() === 'true' : true,
  };
}

// ─── QUESTIONS ────────────────────────────────────────────────────────────────

// Returns { byKey: { key: { dimension, focusArea, scoring } }, dimensions: [...], focusAreas: {...} }
function readQuestions(ss) {
  const sheet = ss.getSheetByName(QUESTIONS_SHEET);
  if (!sheet) return { byKey: {}, dimensions: [], focusAreas: {} };

  const rows = sheet.getDataRange().getValues();
  const byKey = {};
  const dimensionSet = [];
  const focusAreas = {}; // dimension -> [focusArea]

  rows.slice(1).forEach(row => {
    const [key, dimension, focusArea, labelEn, , scoring] = row.map(v => v ? v.toString().trim() : '');
    if (!key) return;
    byKey[key] = { dimension, focusArea, scoring, label: labelEn || key };

    if (dimension && !dimensionSet.includes(dimension)) dimensionSet.push(dimension);
    if (dimension && focusArea) {
      if (!focusAreas[dimension]) focusAreas[dimension] = [];
      if (!focusAreas[dimension].includes(focusArea)) focusAreas[dimension].push(focusArea);
    }
  });

  return { byKey, dimensions: dimensionSet, focusAreas };
}

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────

function readEmployees(ss) {
  const sheet = ss.getSheetByName(EMPLOYEES_SHEET);
  if (!sheet) return { all: [] };

  const data  = sheet.getDataRange().getValues();
  const hdrs  = data[0].map(h => h.toString().trim().toLowerCase());

  const idx = {
    email:         hdrs.indexOf('email'),
    name:          hdrs.indexOf('name'),
    department:    hdrs.indexOf('department'),
    tenure:        hdrs.indexOf('tenure band'),
    region:        hdrs.indexOf('region'),
    gender:        hdrs.indexOf('gender'),
    age:           hdrs.indexOf('age'),
    newDepartment: hdrs.indexOf('new department'),
    division:      hdrs.indexOf('division'),
  };

  const all = data.slice(1).filter(r => r[idx.email] && r[idx.email].toString().trim()).map(r => {
    const get = f => idx[f] >= 0 ? r[idx[f]].toString().trim() : '';
    return {
      email:         get('email').toLowerCase(),
      name:          get('name'),
      department:    get('department'),
      tenure:        get('tenure'),
      region:        get('region'),
      gender:        get('gender'),
      age:           bucketAge(get('age')),
      newDepartment: get('newDepartment'),
      division:      get('division'),
    };
  });

  return { all };
}

// ─── RESPONSES ────────────────────────────────────────────────────────────────

// Returns { rows: [{ demographics, answers }] }
function readResponses(ss, year, questions) {
  const sheet = ss.getSheetByName(RESPONSES_SHEET);
  if (!sheet) return { rows: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { rows: [] };

  const hdrs = data[0].map(h => h.toString().trim());

  const rows = data.slice(1).filter(r => {
    const rowYear = r[0] ? parseInt(r[0]) : null;
    return rowYear === year;
  }).map(r => {
    const demographics = {
      Department:     r[hdrs.indexOf('Department')]     ? r[hdrs.indexOf('Department')].toString().trim()     : '',
      'Tenure Band':  r[hdrs.indexOf('Tenure Band')]    ? r[hdrs.indexOf('Tenure Band')].toString().trim()    : '',
      Region:         r[hdrs.indexOf('Region')]         ? r[hdrs.indexOf('Region')].toString().trim()         : '',
      Gender:         r[hdrs.indexOf('Gender')]         ? r[hdrs.indexOf('Gender')].toString().trim()         : '',
      Age:            bucketAge(r[hdrs.indexOf('Age')] ? r[hdrs.indexOf('Age')].toString().trim() : ''),
      'New Department': r[hdrs.indexOf('New Department')] ? r[hdrs.indexOf('New Department')].toString().trim() : '',
      Division:       r[hdrs.indexOf('Division')]       ? r[hdrs.indexOf('Division')].toString().trim()       : '',
    };

    const answers = {};
    hdrs.forEach((h, i) => {
      if (questions.byKey[h]) {
        const v = r[i];
        answers[h] = (v !== null && v !== undefined && v !== '') ? v : '';
      }
    });

    return { demographics, answers };
  });

  return { rows };
}

// ─── DRAFTS ───────────────────────────────────────────────────────────────────

function readDrafts(ss, year) {
  const sheet = ss.getSheetByName(DRAFTS_SHEET);
  if (!sheet) return 0;
  const data = sheet.getDataRange().getValues();
  return data.slice(1).filter(r => r[1] && parseInt(r[1]) === year).length;
}

// ─── SCORING ──────────────────────────────────────────────────────────────────

function computeEnps(values) {
  if (!values.length) return null;
  const nums = values.map(Number);
  const promoters  = nums.filter(v => v >= 9).length;
  const detractors = nums.filter(v => v <= 6).length;
  return Math.round((promoters - detractors) / nums.length * 100);
}

function computeEnpsBreakdown(values) {
  if (!values.length) return { enps: null, promoters: 0, passives: 0, detractors: 0 };
  const nums = values.map(Number);
  const n = nums.length;
  const promoters  = Math.round(nums.filter(v => v >= 9).length / n * 100);
  const detractors = Math.round(nums.filter(v => v <= 6).length / n * 100);
  const passives   = 100 - promoters - detractors;
  const enps       = promoters - detractors;
  return { enps, promoters, passives, detractors };
}

// Favorability: % of Likert responses that are 4 or 5
function favorability(values) {
  const nums = values.map(Number).filter(v => v >= 1 && v <= 5);
  if (!nums.length) return null;
  return Math.round(nums.filter(v => v >= 4).length / nums.length * 100);
}

function computeIts(values) {
  if (!values.length) return { short: 0, mid: 0, long: 0 };
  const n = values.length;
  const short = Math.round(values.filter(v => v === '1–2 years' || v === '1-2 years').length / n * 100);
  const mid   = Math.round(values.filter(v => v === '3–5 years' || v === '3-5 years').length / n * 100);
  const long  = Math.round(values.filter(v => v === '6+ years').length  / n * 100);
  return { short, mid, long };
}

function round1(n) { return Math.round(n * 10) / 10; }

// ─── DIMENSION / FOCUS AREA SCORES ────────────────────────────────────────────

function computeDimensionScores(rows, questions) {
  // Group Likert question keys by dimension and focus area
  const dimKeys    = {}; // dimension -> [key]
  const focusKeys  = {}; // dimension:focusArea -> [key]

  Object.entries(questions.byKey).forEach(([key, meta]) => {
    if (meta.scoring !== 'Likert') return;
    if (!dimKeys[meta.dimension])   dimKeys[meta.dimension] = [];
    dimKeys[meta.dimension].push(key);

    const fk = meta.dimension + ':' + meta.focusArea;
    if (!focusKeys[fk]) focusKeys[fk] = [];
    focusKeys[fk].push(key);
  });

  // Dimension scores
  const dimensionScores = questions.dimensions.filter(d => d !== 'eNPS' && d !== 'Qualitative Feedback').map(dim => {
    const keys = dimKeys[dim] || [];
    const score = avgFavorability(rows, keys);
    return { key: slugify(dim), label: dim, score };
  }).filter(d => d.score !== null);

  // Focus area scores grouped by dimension
  const focusAreaScores = {};
  questions.dimensions.forEach(dim => {
    const fas = questions.focusAreas[dim] || [];
    const faScores = fas.map(fa => {
      const keys = focusKeys[dim + ':' + fa] || [];
      const score = avgFavorability(rows, keys);
      return { label: fa, score };
    }).filter(f => f.score !== null);
    if (faScores.length) focusAreaScores[slugify(dim)] = faScores;
  });

  return { dimensionScores, focusAreaScores };
}

function avgFavorability(rows, keys) {
  if (!keys.length) return null;
  const scores = keys.map(key => {
    const vals = rows.map(r => r.answers[key]).filter(v => v !== '' && v !== null && v !== undefined);
    return favorability(vals);
  }).filter(s => s !== null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ─── COHORT BREAKDOWN ─────────────────────────────────────────────────────────

function computeCohortBreakdown(employees, responseRows, empField, respField, questions) {
  // Get distinct cohort values from employees (the eligible population)
  const cohortValues = [...new Set(employees.map(e => e[empField]).filter(v => v))].sort();

  return cohortValues.map(val => {
    const eligible = employees.filter(e => e[empField] === val).length;
    const cohortRows = responseRows.filter(r => r.demographics[respField] === val);
    const submitted  = cohortRows.length;

    const enpsVals = cohortRows.map(r => r.answers['enps_enps_1']).filter(v => v !== '' && v !== null && !isNaN(v));
    const { enps, promoters, passives, detractors } = computeEnpsBreakdown(enpsVals);

    return { name: val, eligible, submitted, enps, promoters, passives, detractors };
  }).filter(c => c.eligible > 0);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function bucketAge(val) {
  const n = parseInt(val);
  if (isNaN(n)) return val;
  if (n < 30) return '< 30';
  if (n < 35) return '30–34';
  if (n < 40) return '35–39';
  return '40+';
}

// ─── BREAKDOWN PAGE ───────────────────────────────────────────────────────────

const ANON_FLOOR = 5;

const COHORT_RESP_FIELD = {
  newDepartment: 'New Department',
  division:      'Division',
  tenure:        'Tenure Band',
  region:        'Region',
  gender:        'Gender',
  age:           'Age',
};

function applyFilters_(employees, rows, filters) {
  let emps = employees;
  let rs   = rows;
  if (filters.dept   && filters.dept   !== 'all') {
    emps = emps.filter(e => e.newDepartment === filters.dept);
    rs   = rs.filter(r => r.demographics['New Department'] === filters.dept);
  }
  if (filters.region && filters.region !== 'all') {
    emps = emps.filter(e => e.region    === filters.region);
    rs   = rs.filter(r => r.demographics['Region']       === filters.region);
  }
  if (filters.tenure && filters.tenure !== 'all') {
    emps = emps.filter(e => e.tenure    === filters.tenure);
    rs   = rs.filter(r => r.demographics['Tenure Band']  === filters.tenure);
  }
  if (filters.gender && filters.gender !== 'all') {
    emps = emps.filter(e => e.gender    === filters.gender);
    rs   = rs.filter(r => r.demographics['Gender']       === filters.gender);
  }
  return { emps, rs };
}

function scoreRowsForKeys_(rows, keys) {
  if (!rows.length || !keys.length) return null;
  const scores = keys.map(key => {
    const vals = rows.map(r => r.answers[key]).filter(v => v !== '' && v !== null && v !== undefined);
    return favorability(vals);
  }).filter(s => s !== null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function buildCohortScoreMap_(rows, keys, cohortValues, respField) {
  const map = {};
  cohortValues.forEach(val => {
    const subset = rows.filter(r => r.demographics[respField] === val);
    map[val] = { score: scoreRowsForKeys_(subset, keys), n: subset.length };
  });
  return map;
}

function getBreakdownData(filters, cohortKey) {
  filters   = filters   || {};
  cohortKey = cohortKey || 'newDepartment';

  const ss        = SpreadsheetApp.openById(SS_ID);
  const settings  = readSettings(ss);
  const year      = settings.surveyYear;
  const questions = readQuestions(ss);
  const employees = readEmployees(ss);
  const responses = readResponses(ss, year, questions);

  const { emps: filteredEmps, rs: filteredRows } = applyFilters_(employees.all, responses.rows, filters);

  const respField    = COHORT_RESP_FIELD[cohortKey] || 'New Department';
  const cohortValues = [...new Set(filteredRows.map(r => r.demographics[respField]).filter(v => v))].sort();

  const dimKeys      = {};
  const dimFocusKeys = {};
  const dimFAList    = {};
  Object.entries(questions.byKey).forEach(([key, meta]) => {
    if (meta.scoring !== 'Likert') return;
    if (!dimKeys[meta.dimension])      dimKeys[meta.dimension]      = [];
    if (!dimFAList[meta.dimension])    dimFAList[meta.dimension]    = [];
    dimKeys[meta.dimension].push(key);
    const fk = meta.dimension + ':' + meta.focusArea;
    if (!dimFocusKeys[fk]) dimFocusKeys[fk] = [];
    dimFocusKeys[fk].push(key);
    if (!dimFAList[meta.dimension].includes(meta.focusArea)) dimFAList[meta.dimension].push(meta.focusArea);
  });

  const dimensions = questions.dimensions
    .filter(d => d !== 'eNPS' && d !== 'Qualitative Feedback')
    .map(dim => {
      const keys = dimKeys[dim] || [];
      const avg  = scoreRowsForKeys_(filteredRows, keys);

      const focusAreas = (dimFAList[dim] || []).map(fa => {
        const faKeys = dimFocusKeys[dim + ':' + fa] || [];
        return {
          label:   fa,
          avg:     scoreRowsForKeys_(filteredRows, faKeys),
          cohorts: buildCohortScoreMap_(filteredRows, faKeys, cohortValues, respField),
        };
      });

      return {
        key:        slugify(dim),
        label:      dim,
        avg,
        cohorts:    buildCohortScoreMap_(filteredRows, keys, cohortValues, respField),
        focusAreas,
      };
    });

  return {
    cohortKey,
    cohortValues,
    companyN:  filteredRows.length,
    dimensions,
    anonFloor: ANON_FLOOR,
  };
}

function getQuestionBreakdown(filters, dimKey, faLabel, cohortKey) {
  filters   = filters   || {};
  cohortKey = cohortKey || 'newDepartment';

  const ss        = SpreadsheetApp.openById(SS_ID);
  const settings  = readSettings(ss);
  const year      = settings.surveyYear;
  const questions = readQuestions(ss);
  const employees = readEmployees(ss);
  const responses = readResponses(ss, year, questions);

  const { rs: filteredRows } = applyFilters_(employees.all, responses.rows, filters);

  const respField    = COHORT_RESP_FIELD[cohortKey] || 'New Department';
  const cohortValues = [...new Set(filteredRows.map(r => r.demographics[respField]).filter(v => v))].sort();

  const qEntries = Object.entries(questions.byKey).filter(([, meta]) =>
    meta.scoring === 'Likert' &&
    slugify(meta.dimension) === dimKey &&
    meta.focusArea === faLabel
  );

  const questionsList = qEntries.map(([key, meta]) => {
    const avg     = scoreRowsForKeys_(filteredRows, [key]);
    const cohorts = buildCohortScoreMap_(filteredRows, [key], cohortValues, respField);
    return { key, label: meta.label || key, avg, cohorts };
  });

  return { questions: questionsList, cohortValues };
}
