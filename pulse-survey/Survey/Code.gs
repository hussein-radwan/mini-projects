// ─── CONFIG ───────────────────────────────────────────────────────────────────

const SS_ID = '1QeIYqGnBUdUuWRmqKaemxmb3Q6OSQFUnhK3wdax9e6E';
const EMPLOYEES_SHEET = 'Employees';
const SETTINGS_SHEET   = 'Settings';
const RESPONSES_SHEET  = 'Responses';
const SUBMISSIONS_SHEET = 'Submissions Log';
const DRAFTS_SHEET     = 'Drafts';

// ─── ROUTING ──────────────────────────────────────────────────────────────────

function doGet() {
  return HtmlService.createHtmlOutputFromFile('survey')
    .setTitle('People Pulse Survey')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── AUTH & SESSION ───────────────────────────────────────────────────────────

function getUserEmail() {
  const email = Session.getActiveUser().getEmail();
  if (!email || !email.toLowerCase().endsWith('@dsquares.com')) {
    throw new Error('WRONG_ACCOUNT::' + (email || '(no email detected)'));
  }
  return email;
}

function hashEmail(email) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email.toLowerCase().trim());
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

function getSettings() {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(SETTINGS_SHEET);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  data.forEach(row => {
    if (row[0]) settings[row[0].toString().trim()] = row[1];
  });
  return {
    surveyYear:    settings['Survey Year']    ? parseInt(settings['Survey Year']) : new Date().getFullYear(),
    releaseDate:   settings['Release Date']   ? new Date(settings['Release Date']) : null,
    surveyOpen:    settings['Survey Open']    ? settings['Survey Open'].toString().trim().toLowerCase() === 'true' : true,
  };
}

// ─── EMPLOYEE LOOKUP (sheet first, BambooHR fallback for new joiners) ────────

function getEmployeeProfile(email) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(EMPLOYEES_SHEET);

  if (sheet) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim().toLowerCase());
    const emailIdx   = headers.indexOf('email');
    const nameIdx    = headers.indexOf('name');
    const deptIdx    = headers.indexOf('department');
    const tenureIdx  = headers.indexOf('tenure band');
    const regionIdx  = headers.indexOf('region');
    const genderIdx  = headers.indexOf('gender');
    const ageIdx     = headers.indexOf('age');
    const newDeptIdx = headers.indexOf('new department');
    const divIdx     = headers.indexOf('division');

    for (let i = 1; i < data.length; i++) {
      const rowEmail = data[i][emailIdx] ? data[i][emailIdx].toString().trim().toLowerCase() : '';
      if (rowEmail === email.toLowerCase()) {
        return {
          name:          nameIdx    >= 0 ? data[i][nameIdx].toString().trim()    : '',
          department:    deptIdx    >= 0 ? data[i][deptIdx].toString().trim()    : '',
          tenure:        tenureIdx  >= 0 ? data[i][tenureIdx].toString().trim()  : '',
          region:        regionIdx  >= 0 ? data[i][regionIdx].toString().trim()  : '',
          gender:        genderIdx  >= 0 ? data[i][genderIdx].toString().trim()  : '',
          age:           ageIdx     >= 0 ? data[i][ageIdx].toString().trim()     : '',
          newDepartment: newDeptIdx >= 0 ? data[i][newDeptIdx].toString().trim() : '',
          division:      divIdx     >= 0 ? data[i][divIdx].toString().trim()     : '',
        };
      }
    }
  }

  // Not in sheet — new joiner, fall back to BambooHR
  return getEmployeeFromBamboo(email);
}

function getEmployeeFromBamboo(email) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('BAMBOO_API_KEY');
  const subdomain = props.getProperty('BAMBOO_SUBDOMAIN');
  if (!apiKey || !subdomain) return null;

  const credentials = Utilities.base64Encode(apiKey + ':x');
  const headers = { 'Authorization': 'Basic ' + credentials, 'Accept': 'application/json' };

  const dirResponse = UrlFetchApp.fetch(
    `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/employees/directory`,
    { method: 'GET', headers, muteHttpExceptions: true }
  );
  if (dirResponse.getResponseCode() !== 200) return null;

  const match = (JSON.parse(dirResponse.getContentText()).employees || [])
    .find(e => e.workEmail && e.workEmail.toLowerCase() === email.toLowerCase());
  if (!match) return null;

  Utilities.sleep(500);
  const profileResponse = UrlFetchApp.fetch(
    `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/employees/${match.id}?fields=gender,hireDate,dateOfBirth`,
    { method: 'GET', headers, muteHttpExceptions: true }
  );
  if (profileResponse.getResponseCode() !== 200) return null;

  const profile = JSON.parse(profileResponse.getContentText());

  const emp = {
    name:          ((match.firstName || '') + ' ' + (match.lastName || '')).trim(),
    department:    match.department || '',
    tenure:        calcTenureBand(profile.hireDate),
    region:        match.location || '',
    gender:        profile.gender || '',
    age:           calcAge(profile.dateOfBirth),
    newDepartment: '',
    division:      '',
  };

  // Write new joiner to sheet for future lookups
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(EMPLOYEES_SHEET);
  if (sheet) sheet.appendRow([email, emp.name, emp.department, emp.tenure, emp.region, emp.gender, emp.age, emp.newDepartment, emp.division]); // Email, Name, Department, Tenure Band, Region, Gender, Age, New Department, Division

  return emp;
}

function calcAge(dob) {
  if (!dob) return '';
  const years = (new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(years).toString();
}

function calcTenureBand(hireDate) {
  if (!hireDate) return '';
  const days = (new Date() - new Date(hireDate)) / (1000 * 60 * 60 * 24);
  if (days < 90)  return '< 3 months';
  const years = days / 365.25;
  if (years < 1)  return '< 1 year';
  if (years < 3)  return '1-3 years';
  if (years < 5)  return '3-5 years';
  if (years < 7)  return '5-7 years';
  return '7+ years';
}

// ─── SUBMISSION CHECK ─────────────────────────────────────────────────────────

function hasSubmitted(email, year) {
  const hash = hashEmail(email);
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(SUBMISSIONS_SHEET);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (
      data[i][0] && data[i][0].toString() === hash &&
      data[i][1] && parseInt(data[i][1]) === parseInt(year)
    ) return true;
  }
  return false;
}

// ─── DRAFT ────────────────────────────────────────────────────────────────────

function getDraft(email, year) {
  const hash = hashEmail(email);
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(DRAFTS_SHEET);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (
      data[i][0] && data[i][0].toString() === hash &&
      data[i][1] && parseInt(data[i][1]) === parseInt(year)
    ) {
      const raw = data[i][2] ? data[i][2].toString() : '{}';
      try { return JSON.parse(raw); } catch(e) { return {}; }
    }
  }
  return null;
}

function saveDraft(email, year, answers) {
  const hash = hashEmail(email);
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(DRAFTS_SHEET);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (
      data[i][0] && data[i][0].toString() === hash &&
      data[i][1] && parseInt(data[i][1]) === parseInt(year)
    ) {
      sheet.getRange(i + 1, 3).setValue(JSON.stringify(answers));
      return;
    }
  }
  sheet.appendRow([hash, year, JSON.stringify(answers)]);
}

function deleteDraft(email, year) {
  const hash = hashEmail(email);
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(DRAFTS_SHEET);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (
      data[i][0] && data[i][0].toString() === hash &&
      data[i][1] && parseInt(data[i][1]) === parseInt(year)
    ) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

// ─── MAIN ENTRY POINT (called on page load) ───────────────────────────────────

function initSurvey() {
  const email = getUserEmail();
  const settings = getSettings();
  const { surveyYear, releaseDate, surveyOpen } = settings;

  // Check survey is open
  if (!surveyOpen) {
    return { status: 'closed', message: 'The survey is currently closed.' };
  }
  if (releaseDate && new Date() < releaseDate) {
    return { status: 'not_open_yet', message: 'The survey has not opened yet. Please check back later.' };
  }

  // Check already submitted
  if (hasSubmitted(email, surveyYear)) {
    return { status: 'already_submitted', message: 'You have already completed the ' + surveyYear + ' People Pulse Survey. Thank you!' };
  }

  // Look up employee profile
  const profile = getEmployeeProfile(email);
  if (!profile) {
    return { status: 'not_found', message: 'Your account was not found in the employee directory. Please contact HR.' };
  }

  // Block users with less than 3 months tenure
  if (profile.tenure === '< 3 months') {
    return { status: 'too_new', message: 'You need to be with Dsquares for at least 3 months to take this survey. Welcome to the team!' };
  }

  // Load draft if exists
  const draft = getDraft(email, surveyYear);

  return {
    status: 'ok',
    surveyYear,
    profile,
    draft,
  };
}

// ─── AUTO-SAVE DRAFT (called periodically from client) ───────────────────────

function autoSaveDraft(answers) {
  const email = getUserEmail();
  const settings = getSettings();
  saveDraft(email, settings.surveyYear, answers);
  return { ok: true };
}

// ─── FINAL SUBMIT ─────────────────────────────────────────────────────────────

function submitSurvey(answers) {
  const email = getUserEmail();
  const settings = getSettings();
  const { surveyYear } = settings;

  // Guard: double-check not already submitted
  if (hasSubmitted(email, surveyYear)) {
    return { status: 'already_submitted' };
  }

  const profile = getEmployeeProfile(email);

  // Build the response row - anonymous (no email, no name)
  // Columns: Year, Department, Tenure, Region, Gender, Age, then all question keys in order
  const row = [
    surveyYear,
    profile ? profile.department : '',
    profile ? profile.tenure     : '',
    profile ? profile.region     : '',
    profile ? profile.gender     : '',
    profile ? (profile.age || '') : '',
  ];

  // Append answers in question key order
  QUESTION_KEYS.forEach(key => {
    row.push(answers[key] !== undefined ? answers[key] : '');
  });

  // Append new demographic columns (added after the question keys)
  row.push(profile ? (profile.newDepartment || '') : '');
  row.push(profile ? (profile.division || '')      : '');

  const ss = SpreadsheetApp.openById(SS_ID);
  ss.getSheetByName(RESPONSES_SHEET).appendRow(row);

  // Log submission (hashed email + year only)
  ss.getSheetByName(SUBMISSIONS_SHEET).appendRow([hashEmail(email), surveyYear]);

  // Delete draft
  deleteDraft(email, surveyYear);

  return { status: 'ok' };
}

// ─── QUESTION KEYS (order matches Responses sheet columns) ───────────────────
// Format: dimension_metricSlug_qIndex

const QUESTION_KEYS = [
  // eNPS
  'enps_enps_1',

  // Engagement
  'eng_engagement_1',
  'eng_engagement_2',
  'eng_purpose_1',
  'eng_purpose_2',
  'eng_growth_1',
  'eng_growth_1_followup',
  'eng_growth_2',
  'eng_growth_3',
  'eng_growth_4',
  'eng_growth_5',
  'eng_comms_1',
  'eng_efficiency_1',
  'eng_trust_1',

  // Culture
  'cul_values_1',
  'cul_values_2',
  'cul_growth_1',
  'cul_comms_1',
  'cul_comms_2',
  'cul_comms_3',
  'cul_collab_1',
  'cul_collab_2',
  'cul_collab_2_followup',
  'cul_dei_1',
  'cul_dei_2',
  'cul_dei_3',
  'cul_efficiency_1',
  'cul_efficiency_2',
  'cul_efficiency_3',
  'cul_efficiency_4',
  'cul_trust_1',

  // Wellbeing
  'wel_wellbeing_1',
  'wel_wellbeing_2',
  'wel_wellbeing_2_followup',
  'wel_wellbeing_3',
  'wel_wellbeing_4',
  'wel_wellbeing_5',

  // Leadership
  'lea_trust_1',
  'lea_trust_2',
  'lea_strategy_1',
  'lea_strategy_1_followup',
  'lea_strategy_2',
  'lea_mgmt_1',
  'lea_mgmt_2',
  'lea_mgmt_2_followup',
  'lea_mgmt_3',
  'lea_mgmt_4',
  'lea_comms_1',

  // Reward & Recognition
  'rew_recognition_1',
  'rew_recognition_2',
  'rew_recognition_3',
  'rew_recognition_4',
  'rew_rewards_1',
  'rew_rewards_2',
  'rew_recognition_5',

  // Intention to Stay
  'its_stay_1',
  'its_stay_2',
  'its_stay_3',
  'its_stay_3_followup',

  // Qualitative
  'qual_dept_improve',
  'qual_company_improve',
  'qual_improved_since',
];

// ─── QUESTION METADATA (used to populate Questions lookup sheet) ──────────────

const QUESTION_META = [
  // key | dimension | focus area | english | arabic | scoring
  ['enps_enps_1',             'eNPS',                 'eNPS',                       'On a scale of 1–10, how likely are you to recommend Dsquares as a great place to work to your family and friends?', 'من 1 إلى 10، ما مدى احتمالية أن توصي بشركة Dsquares كمكان رائع للعمل لأصدقائك وعائلتك؟', '1-10'],
  ['eng_engagement_1',        'Engagement',           'Engagement',                 'I am proud to work for Dsquares.', 'أنا فخور بالعمل في Dsquares.', 'Likert'],
  ['eng_engagement_2',        'Engagement',           'Engagement',                 'I am motivated to go beyond what is normally expected to help Dsquares be successful.', 'أنا متحمس لتقديم أكثر مما هو متوقع مني للمساهمة في نجاح Dsquares.', 'Likert'],
  ['eng_purpose_1',           'Engagement',           'Purpose & Meaning',          'My work has special meaning and purpose: this is not "just a job".', 'عملي له معنى وهدف بالنسبة لي؛ فهو ليس مجرد وظيفة.', 'Likert'],
  ['eng_purpose_2',           'Engagement',           'Purpose & Meaning',          'I understand how my job contributes to the wider business goals.', 'أنا أعرف كيف يساهم دوري في تحقيق أهداف الشركة.', 'Likert'],
  ['eng_growth_1',            'Engagement',           'Career Growth & Development', 'I feel I can reach my full potential here.', 'أنا أشعر أنني قادر على الوصول لكامل إمكانياتي في Dsquares.', 'Likert'],
  ['eng_growth_1_followup',   'Engagement',           'Career Growth & Development', 'What is limiting your ability to reach your full potential?', 'ما الذي يحدّ من قدرتك على الوصول و تحقيق كامل إمكانياتك؟', 'Qualitative'],
  ['eng_growth_2',            'Engagement',           'Career Growth & Development', 'I have a good understanding of the possible career paths available to me at Dsquares.', 'لدي فهم جيد للمسارات المهنية المتاحة لي في Dsquares.', 'Likert'],
  ['eng_growth_3',            'Engagement',           'Career Growth & Development', 'I receive the relevant and useful training and development needed to do my job effectively.', 'أنا أتلقى التدريب والتطوير المناسب و اللازم لأداء عملي بفعالية.', 'Likert'],
  ['eng_growth_4',            'Engagement',           'Career Growth & Development', 'My performance conversations focus on future growth, not just past evaluation.', 'تركّز مناقشات الأداء الخاصة بي على التطور المستقبلي، وليس فقط التقييم السابق.', 'Likert'],
  ['eng_growth_5',            'Engagement',           'Career Growth & Development', 'When people change jobs internally or get promoted, they are supported and set up for success.', 'عند ترقيت أو انتقال الموظفين داخليًا, يتم دعمهم وتجهيزهم للنجاح في الوظيفة الجديدة.', 'Likert'],
  ['eng_comms_1',             'Engagement',           'Communication',              'I feel connected and engaged with the company through communications and channels that keep me informed.', 'أشعر بالاندماج الوظيفي انى على اتصال مع الشركة من خلال قنوات التواصل التي تبقيني على اطلاع.', 'Likert'],
  ['eng_efficiency_1',        'Engagement',           'Efficiency & Performance',   'I have full clarity on what is expected from me in my current role.', 'لدي وضوح كامل بشأن ما هو متوقع مني في دوري الحالي.', 'Likert'],
  ['eng_trust_1',             'Engagement',           'Trust',                      'I have a caring and trusting relationship with my colleagues.', 'أتمتع بعلاقة قائمة على الثقة والاهتمام مع زملائي.', 'Likert'],
  ['cul_values_1',            'Culture',              'Company Values',             'I know what the values of Dsquares are.', 'أنا أعلم ما هي قيم Dsquares.', 'Likert'],
  ['cul_values_2',            'Culture',              'Company Values',             'I fully support the values of Dsquares.', 'أنا أدعم قيم Dsquares بشكل كامل.', 'Likert'],
  ['cul_growth_1',            'Culture',              'Career Growth & Development', 'I have the opportunity to continually grow and learn at Dsquares.', 'أنا لدي الفرصة للنمو والتعلّم بشكل مستمر في Dsquares.', 'Likert'],
  ['cul_comms_1',             'Culture',              'Communication',              'The company does a good job communicating to employees on matters that affect them.', 'تقوم الشركة بالتواصل بشكل جيد مع الموظفين حول الأمور التي تؤثر عليهم.', 'Likert'],
  ['cul_comms_2',             'Culture',              'Communication',              'The company communicates its priorities, updates, and directions clearly.', 'تقوم الشركة بتوضيح أولوياتها وتحديثاتها واتجاهاتها بشكل واضح.', 'Likert'],
  ['cul_comms_3',             'Culture',              'Communication',              'I am well informed about Dsquares business strategy and objectives.', 'أنا على اطلاع جيد باستراتيجية الشركة وأهدافها.', 'Likert'],
  ['cul_collab_1',            'Culture',              'Collaboration',              'There is a spirit of cooperation and teamwork within my department.', 'هناك روح تعاون وعمل جماعي جيد داخل إدارتي.', 'Likert'],
  ['cul_collab_2',            'Culture',              'Collaboration',              'There is good teamwork and cooperation between my department and other departments.', 'هناك تعاون جيد بين إدارتي والإدارات الأخرى.', 'Likert'],
  ['cul_collab_2_followup',   'Culture',              'Collaboration',              'What is getting in the way of collaboration with other teams?', 'ما الذي يعيق التعاون مع الفرق الأخرى؟', 'Qualitative'],
  ['cul_dei_1',               'Culture',              'DEI',                        'I am treated with respect and feel included in the team.', 'أنا أُعامل باحترام وأشعر بالاندماج ضمن الفريق.', 'Likert'],
  ['cul_dei_2',               'Culture',              'DEI',                        'I feel comfortable being my true and genuine self here.', 'أنا أشعر بالراحة و قادر على أن أكون على طبيعتي هنا.', 'Likert'],
  ['cul_dei_3',               'Culture',              'DEI',                        'The company treats employees fairly and provides equal opportunities for everyone to succeed.', 'تعامل الشركة الموظفين بعدالة وتوفر فرصًا متكافئة للجميع للنجاح.', 'Likert'],
  ['cul_efficiency_1',        'Culture',              'Efficiency & Performance',   'I feel I have the right tools and resources (equipment, software, hardware, etc.) to do my job properly.', 'لدي الأدوات والموارد اللازمة (مثل المعدات، البرامج، الأجهزة، إلخ) لأداء عملي بشكل صحيح.', 'Likert'],
  ['cul_efficiency_2',        'Culture',              'Efficiency & Performance',   'In my team, we are clear about who is responsible for what.', 'في فريقي، هناك وضوح حول المسؤوليات والأدوار.', 'Likert'],
  ['cul_efficiency_3',        'Culture',              'Efficiency & Performance',   'In my team, the work is well organized and there is little wasted time or effort.', 'في فريقي، يتم تنظيم العمل بشكل جيد مع تقليل الهدر في الوقت أو الجهد (مثل التكرار أو إعادة العمل).', 'Likert'],
  ['cul_efficiency_4',        'Culture',              'Efficiency & Performance',   'In my team, decisions are made efficiently enough to meet project timelines.', 'في فريقي، يتم اتخاذ القرارات بكفاءة للوفاء بمواعيد المشاريع.', 'Likert'],
  ['cul_trust_1',             'Culture',              'Trust',                      'I feel safe to ask questions, express different opinions and admit when I don\'t know something.', 'أشعر بالأمان لطرح الأسئلة، والتعبير عن آرائي، والاعتراف عندما لا أعرف شيئًا.', 'Likert'],
  ['wel_wellbeing_1',         'Wellbeing',            'Wellbeing Index',            'On a scale of 1–10, how would you rate your overall wellbeing on a typical work week?', 'من 1 إلى 10، كيف تقيّم مستوى الصحة و الرفاه الوظيفي لديك خلال أسبوع عمل عادي؟', '1-10'],
  ['wel_wellbeing_2',         'Wellbeing',            'Wellbeing',                  'The flexible working policy contributes positively to balancing my work and personal life.', 'سياسة العمل المرن في الشركة تساهم بشكل إيجابي في تحقيق التوازن بين حياتي العملية والشخصية.', 'Likert'],
  ['wel_wellbeing_2_followup','Wellbeing',            'Wellbeing',                  'Please elaborate on the impact you are experiencing.', 'يرجى توضيح تأثير ذلك عليك.', 'Qualitative'],
  ['wel_wellbeing_3',         'Wellbeing',            'Wellbeing',                  'The amount of work expected of me is reasonable.', 'حجم العمل المطلوب مني مقبول و معتدل.', 'Likert'],
  ['wel_wellbeing_4',         'Wellbeing',            'Wellbeing',                  'I am satisfied with my physical working environment (workspace, facilities, safety, etc.)', 'أنا راضي عن بيئة العمل في الشركة من ناحية المكتب، المرافق، السلامة، إلخ.', 'Likert'],
  ['wel_wellbeing_5',         'Wellbeing',            'Wellbeing',                  'My manager is open to discuss concerns and make the necessary adjustments to support my mental wellbeing.', 'مديري منفتح على مناقشة المخاوف وإجراء التعديلات اللازمة لدعم صحتي النفسية.', 'Likert'],
  ['lea_trust_1',             'Leadership',           'Trust',                      'I trust my manager/department manager.', 'أنا أثق بمديري/مدير الإدارة.', 'Likert'],
  ['lea_trust_2',             'Leadership',           'Trust',                      'Senior leadership\'s actions match its words.', 'تصرفات الإدارة العليا تتماشى مع أقوالها.', 'Likert'],
  ['lea_strategy_1',          'Leadership',           'Confidence in Strategy',     'I trust that the company is making the necessary changes to become more competitive and results-driven.', 'أنا أثق بأن الشركة تتخذ الخطوات اللازمة لتصبح أكثر تنافسية وتركيزًا على النتائج.', 'Likert'],
  ['lea_strategy_1_followup', 'Leadership',           'Confidence in Strategy',     'What could be missing for the company to become more performance and results-driven?', 'ما الذي يمكن للشركة فعله لتكون أكثر تركيزًا على الأداء والنتائج؟', 'Qualitative'],
  ['lea_strategy_2',          'Leadership',           'Confidence in Strategy',     'I believe the results of this survey will be used constructively by management.', 'أؤمن بأن نتائج هذا الاستبيان سيتم استخدامها بشكل بنّاء من قبل الإدارة العليا.', 'Likert'],
  ['lea_mgmt_1',              'Leadership',           'Management',                 'My manager/department manager listens when I have ideas or feedback.', 'مديري يستمع إلى أفكاري وملاحظاتي.', 'Likert'],
  ['lea_mgmt_2',              'Leadership',           'Management',                 'I am confident in my manager\'s ability to manage our team effectively and drive performance.', 'أنا واثق من قدرة مديري على إدارة الفريق بفعالية وتحقيق الأداء المطلوب.', 'Likert'],
  ['lea_mgmt_2_followup',     'Leadership',           'Management',                 'What could your manager do differently to improve team effectiveness?', 'ما الذي يمكن لمديرك القيام به بشكل مختلف لتحسين فعالية الفريق؟', 'Qualitative'],
  ['lea_mgmt_3',              'Leadership',           'Management',                 'My manager spends time in coaching me, discussing my performance progress, and developing my skills.', 'مديري يقضي وقتًا في توجيهي ومناقشة أدائي والتطوير من مهاراتي.', 'Likert'],
  ['lea_mgmt_4',              'Leadership',           'Management',                 'My manager shows empathy when I share both personal and work-related concerns.', 'مديري يُظهر تعاطفًه عندما أشارك مخاوفي الشخصية أو المتعلقة بالعمل.', 'Likert'],
  ['lea_comms_1',             'Leadership',           'Communication',              'My manager sets clear priorities and shares important information, changes, and business updates.', 'مديري يحدد الأولويات بوضوح ويشارك المعلومات والتحديثات المهمة.', 'Likert'],
  ['rew_recognition_1',       'Reward & Recognition', 'Appreciation & Recognition', 'My manager recognizes me for my contributions (big or small).', 'يعترف مديري بمساهماتي (سواء كانت كبيرة أو صغيرة).', 'Likert'],
  ['rew_recognition_2',       'Reward & Recognition', 'Appreciation & Recognition', 'I feel valued as an individual in my team.', 'أنا أشعر بأنني مُقدّر كفرد في فريقي.', 'Likert'],
  ['rew_recognition_3',       'Reward & Recognition', 'Appreciation & Recognition', 'In my department, we celebrate our individual and collective successes.', 'في إدارتي، نحتفل بالنجاحات الفردية والجماعية.', 'Likert'],
  ['rew_recognition_4',       'Reward & Recognition', 'Appreciation & Recognition', 'Management shows appreciation for good work and extra effort.', 'الادارة تظهر تقديرها للعمل الجيد والجهد الإضافي.', 'Likert'],
  ['rew_rewards_1',           'Reward & Recognition', 'Rewards & Benefits',         'I am satisfied with my pay/compensation.', 'أنا راضي عن راتبي/تعويضي المالي.', 'Likert'],
  ['rew_rewards_2',           'Reward & Recognition', 'Rewards & Benefits',         'I am satisfied with the benefits offered (i.e. medical insurance, etc.)', 'أنا راضي عن المزايا المقدمة من الشركة (مثل التأمين الطبي، إلخ).', 'Likert'],
  ['rew_recognition_5',       'Reward & Recognition', 'Appreciation & Recognition', 'Recognition here is consistent and given in a timely manner.', 'يتم تقديم التقدير هنا بشكل مستمر وفي الوقت المناسب.', 'Likert'],
  ['its_stay_1',              'Intention to Stay',    'Intention to Stay',          'I would choose to stay with Dsquares even if offered the same pay and benefits elsewhere.', 'سأختار البقاء في Dsquares حتى لو عُرض علي نفس الراتب والمزايا في مكان آخر.', 'Likert'],
  ['its_stay_2',              'Intention to Stay',    'Intention to Stay',          'I intend to keep working at Dsquares for…', 'سأختار البقاء للعمل في Dsquares لمدة…', 'Select'],
  ['its_stay_3',              'Intention to Stay',    'Intention to Stay',          'Overall, my experience working at Dsquares meets my expectations.', 'بشكل عام، تجربتي في العمل في Dsquares على مستوى توقعاتي.', 'Likert'],
  ['its_stay_3_followup',     'Intention to Stay',    'Intention to Stay',          'What aspects of your experience do not meet your expectations?', 'ما الجوانب التي لا تلبي توقعاتك؟', 'Qualitative'],
  ['qual_dept_improve',       'Qualitative Feedback', 'Qualitative Feedback',       'If there is one thing your department could improve, what would it be?', 'إذا كان هناك أمر واحد يمكن لفريقك تحسينه، فما هو؟', 'Qualitative'],
  ['qual_company_improve',    'Qualitative Feedback', 'Qualitative Feedback',       'If there is one thing the company could improve, what would it be?', 'إذا كان هناك أمر واحد يمكن للشركة تحسينه، فما هو؟', 'Qualitative'],
  ['qual_improved_since',     'Qualitative Feedback', 'Qualitative Feedback',       'What is the one thing that has improved following the last survey?', 'ما هو أكثر شيء ترى أنه قد تحسّن منذ الاستبيان السابق؟', 'Qualitative'],
];

// ─── SHEET INITIALIZER (run once manually to set up sheet structure) ──────────

function setupSheets() {
  const ss = SpreadsheetApp.openById(SS_ID);

  // Settings
  let s = ss.getSheetByName(SETTINGS_SHEET);
  if (!s) s = ss.insertSheet(SETTINGS_SHEET);
  s.clearContents();
  s.getRange('A1:B4').setValues([
    ['Survey Year',  new Date().getFullYear()],
    ['Release Date', ''],
    ['Survey Open',  'true'],
    ['',             ''],
  ]);
  s.getRange('A1:A3').setFontWeight('bold');

  // Submissions Log
  let sub = ss.getSheetByName(SUBMISSIONS_SHEET);
  if (!sub) sub = ss.insertSheet(SUBMISSIONS_SHEET);
  sub.clearContents();
  sub.getRange('A1:B1').setValues([['Email (hashed)', 'Year']]);
  sub.getRange('A1:B1').setFontWeight('bold');

  // Drafts
  let dr = ss.getSheetByName(DRAFTS_SHEET);
  if (!dr) dr = ss.insertSheet(DRAFTS_SHEET);
  dr.clearContents();
  dr.getRange('A1:C1').setValues([['Email (hashed)', 'Year', 'Answers (JSON)']]);
  dr.getRange('A1:C1').setFontWeight('bold');

  // Responses
  let resp = ss.getSheetByName(RESPONSES_SHEET);
  if (!resp) resp = ss.insertSheet(RESPONSES_SHEET);
  resp.clearContents();
  const respHeaders = ['Year', 'Department', 'Tenure Band', 'Region', 'Gender', 'Age', ...QUESTION_KEYS];
  resp.getRange(1, 1, 1, respHeaders.length).setValues([respHeaders]);
  resp.getRange(1, 1, 1, respHeaders.length).setFontWeight('bold');

  setupQuestionsSheet(ss);
  SpreadsheetApp.getUi().alert('Sheets set up successfully.');
}

function setupQuestionsSheet(ss) {
  ss = ss || SpreadsheetApp.openById(SS_ID);
  let q = ss.getSheetByName('Questions');
  if (!q) q = ss.insertSheet('Questions');
  q.clearContents();

  const headers = ['Key', 'Dimension', 'Focus Area', 'Question (English)', 'Question (Arabic)', 'Scoring'];
  q.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  q.getRange(2, 1, QUESTION_META.length, headers.length).setValues(QUESTION_META);
  q.setFrozenRows(1);
  q.autoResizeColumns(1, headers.length);
}
