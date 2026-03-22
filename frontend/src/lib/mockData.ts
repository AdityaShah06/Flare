import type { Student, TimelineItem, Projection, RiskDistribution, DemoAccount, ShapEntry, RiskHistoryPoint } from '@/types'

// ── Helpers ──────────────────────────────────────────────────────
function isoDate(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString()
}

function buildHistory(base: number, end: number, volatility = 2.0): RiskHistoryPoint[] {
  const points: RiskHistoryPoint[] = []
  let seed = 42
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  for (let i = 0; i < 14; i++) {
    const t = i / 13
    let score = base + (end - base) * t + (rand() * 2 - 1) * volatility
    score = Math.max(0, Math.min(100, Math.round(score * 10) / 10))
    const ts = new Date()
    ts.setDate(ts.getDate() - (13 - i))
    points.push({ timestamp: ts.toISOString(), score })
  }
  return points
}

function buildShap(riskLevel: string): ShapEntry[] {
  if (riskLevel === 'low') {
    return [
      { feature: 'missed_ratio', value: 0.0, shap: -0.15, direction: 'protective', human_label: 'No missed assignments' },
      { feature: 'avg_grade', value: 91.0, shap: -0.22, direction: 'protective', human_label: 'Strong average grade' },
      { feature: 'min_grade', value: 87.0, shap: -0.08, direction: 'protective', human_label: 'High minimum grade' },
      { feature: 'credit_hours', value: 9.0, shap: -0.03, direction: 'protective', human_label: 'Moderate course load' },
      { feature: 'consecutive_missed', value: 0.0, shap: -0.10, direction: 'protective', human_label: 'No consecutive misses' },
      { feature: 'grade_variance', value: 2.1, shap: -0.05, direction: 'protective', human_label: 'Consistent grades' },
      { feature: 'submission_velocity', value: 3.0, shap: -0.04, direction: 'protective', human_label: 'Good submission pace' },
    ]
  }
  if (riskLevel === 'medium') {
    return [
      { feature: 'missed_ratio', value: 0.15, shap: 0.12, direction: 'risk', human_label: '15% missed' },
      { feature: 'avg_grade', value: 76.0, shap: 0.08, direction: 'risk', human_label: 'Below-average grades' },
      { feature: 'min_grade', value: 72.0, shap: 0.06, direction: 'risk', human_label: 'Low minimum grade' },
      { feature: 'credit_hours', value: 9.0, shap: -0.02, direction: 'protective', human_label: 'Moderate course load' },
      { feature: 'consecutive_missed', value: 1.0, shap: 0.05, direction: 'risk', human_label: '1 consecutive miss' },
      { feature: 'grade_variance', value: 5.3, shap: 0.04, direction: 'risk', human_label: 'Inconsistent grades' },
      { feature: 'submission_velocity', value: 2.0, shap: 0.03, direction: 'risk', human_label: 'Declining submissions' },
    ]
  }
  if (riskLevel === 'high') {
    return [
      { feature: 'missed_ratio', value: 0.35, shap: 0.22, direction: 'risk', human_label: '35% missed' },
      { feature: 'avg_grade', value: 63.0, shap: 0.18, direction: 'risk', human_label: 'Failing average' },
      { feature: 'min_grade', value: 58.0, shap: 0.14, direction: 'risk', human_label: 'Very low min grade' },
      { feature: 'credit_hours', value: 9.0, shap: -0.01, direction: 'protective', human_label: 'Moderate load' },
      { feature: 'consecutive_missed', value: 2.0, shap: 0.12, direction: 'risk', human_label: '2 consecutive misses' },
      { feature: 'grade_variance', value: 8.7, shap: 0.08, direction: 'risk', human_label: 'Very inconsistent' },
      { feature: 'submission_velocity', value: 1.0, shap: 0.06, direction: 'risk', human_label: 'Low submission rate' },
    ]
  }
  // critical
  return [
    { feature: 'missed_ratio', value: 0.55, shap: 0.35, direction: 'risk', human_label: '55% missed' },
    { feature: 'avg_grade', value: 49.0, shap: 0.28, direction: 'risk', human_label: 'Failing average' },
    { feature: 'min_grade', value: 44.0, shap: 0.22, direction: 'risk', human_label: 'Critical min grade' },
    { feature: 'credit_hours', value: 10.0, shap: 0.05, direction: 'risk', human_label: 'Heavy course load' },
    { feature: 'consecutive_missed', value: 4.0, shap: 0.20, direction: 'risk', human_label: '4 consecutive misses' },
    { feature: 'grade_variance', value: 12.4, shap: 0.12, direction: 'risk', human_label: 'Extreme variance' },
    { feature: 'submission_velocity', value: 0.5, shap: 0.10, direction: 'risk', human_label: 'Almost no submissions' },
  ]
}

// ── Student Data ─────────────────────────────────────────────────
function buildStudents(): Student[] {
  return [
    {
      id: 'STU001', name: 'Marcus Webb', email: 'm.webb@truman.edu',
      major: 'Computer Science', year: 3, gpa: 3.7, advisor_id: 'ADV001',
      avatar_initials: 'MW',
      risk_score: 12, risk_level: 'low', risk_flags: [],
      risk_history: buildHistory(10, 12, 2.0),
      shap_explanation: buildShap('low'), projected_score_7d: 13, trend: 'stable',
      will_cross_critical: false, last_updated: isoDate(0),
      courses: [
        { id: 'c101', name: 'Data Structures & Algorithms', code: 'CS 315', credits: 3,
          current_grade: 93.2, instructor: 'Dr. David Park',
          assignments: [
            { id: 'a1001', title: 'Sorting Algorithm Analysis', due_date: isoDate(-12), submitted: true, grade: 95.0, points_possible: 100 },
            { id: 'a1002', title: 'Binary Tree Traversal Lab', due_date: isoDate(-8), submitted: true, grade: 92.0, points_possible: 100 },
            { id: 'a1003', title: 'Hash Table Implementation', due_date: isoDate(-3), submitted: true, grade: 94.0, points_possible: 100 },
            { id: 'a1004', title: 'Graph Shortest Path Project', due_date: isoDate(5), submitted: false, grade: null, points_possible: 100 },
            { id: 'a1005', title: 'Dynamic Programming Set', due_date: isoDate(11), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c102', name: 'Operating Systems', code: 'CS 365', credits: 3,
          current_grade: 90.5, instructor: 'Dr. Kevin Wu',
          assignments: [
            { id: 'a1006', title: 'Process Scheduling Sim', due_date: isoDate(-10), submitted: true, grade: 89.0, points_possible: 100 },
            { id: 'a1007', title: 'Memory Management Lab', due_date: isoDate(-5), submitted: true, grade: 92.0, points_possible: 100 },
            { id: 'a1008', title: 'File System Design Report', due_date: isoDate(-1), submitted: true, grade: 91.0, points_possible: 100 },
            { id: 'a1009', title: 'Concurrency & Deadlocks', due_date: isoDate(7), submitted: false, grade: null, points_possible: 50 },
            { id: 'a1010', title: 'Virtual Memory Project', due_date: isoDate(14), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c103', name: 'Discrete Mathematics', code: 'MATH 263', credits: 3,
          current_grade: 88.7, instructor: 'Dr. Linda Zhao',
          assignments: [
            { id: 'a1011', title: 'Set Theory Proofs', due_date: isoDate(-13), submitted: true, grade: 90.0, points_possible: 100 },
            { id: 'a1012', title: 'Combinatorics Problem Set', due_date: isoDate(-7), submitted: true, grade: 87.0, points_possible: 100 },
            { id: 'a1013', title: 'Graph Theory Exercises', due_date: isoDate(-2), submitted: true, grade: 89.0, points_possible: 100 },
            { id: 'a1014', title: 'Boolean Logic Worksheet', due_date: isoDate(4), submitted: false, grade: null, points_possible: 50 },
            { id: 'a1015', title: 'Recurrence Relations Exam', due_date: isoDate(12), submitted: false, grade: null, points_possible: 100 },
          ]},
      ],
    },
    {
      id: 'STU002', name: 'Priya Nair', email: 'p.nair@truman.edu',
      major: 'Biology', year: 2, gpa: 3.5, advisor_id: 'ADV001',
      avatar_initials: 'PN',
      risk_score: 18, risk_level: 'low', risk_flags: [],
      risk_history: buildHistory(14, 18, 2.5),
      shap_explanation: buildShap('low'), projected_score_7d: 19, trend: 'stable',
      will_cross_critical: false, last_updated: isoDate(0),
      courses: [
        { id: 'c201', name: 'Organic Chemistry II', code: 'CHEM 332', credits: 4,
          current_grade: 87.4, instructor: 'Dr. Robert Hayes',
          assignments: [
            { id: 'a2001', title: 'Nucleophilic Substitution Lab', due_date: isoDate(-11), submitted: true, grade: 89.0, points_possible: 100 },
            { id: 'a2002', title: 'Reaction Mechanisms Sheet', due_date: isoDate(-6), submitted: true, grade: 86.0, points_possible: 100 },
            { id: 'a2003', title: 'Spectroscopy Analysis', due_date: isoDate(-2), submitted: true, grade: 88.0, points_possible: 100 },
            { id: 'a2004', title: 'Aldol Condensation Lab', due_date: isoDate(6), submitted: false, grade: null, points_possible: 100 },
            { id: 'a2005', title: 'Aromatic Compounds Exam', due_date: isoDate(13), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c202', name: 'Genetics', code: 'BIOL 314', credits: 3,
          current_grade: 91.0, instructor: 'Dr. Maria Santos',
          assignments: [
            { id: 'a2006', title: 'DNA Replication Lab', due_date: isoDate(-9), submitted: true, grade: 93.0, points_possible: 100 },
            { id: 'a2007', title: 'Mendelian Genetics Set', due_date: isoDate(-4), submitted: true, grade: 90.0, points_possible: 100 },
            { id: 'a2008', title: 'Gene Expression Analysis', due_date: isoDate(-1), submitted: true, grade: 91.0, points_possible: 100 },
            { id: 'a2009', title: 'Population Genetics Sim', due_date: isoDate(8), submitted: false, grade: null, points_possible: 100 },
            { id: 'a2010', title: 'Chromosomal Mapping', due_date: isoDate(14), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c203', name: 'Ecology & Conservation', code: 'BIOL 340', credits: 3,
          current_grade: 85.8, instructor: 'Dr. James Turner',
          assignments: [
            { id: 'a2011', title: 'Ecosystem Dynamics Report', due_date: isoDate(-10), submitted: true, grade: 85.0, points_possible: 100 },
            { id: 'a2012', title: 'Biodiversity Field Study', due_date: isoDate(-5), submitted: true, grade: 87.0, points_possible: 100 },
            { id: 'a2013', title: 'Conservation Policy Paper', due_date: isoDate(-1), submitted: true, grade: 86.0, points_possible: 100 },
            { id: 'a2014', title: 'Habitat Restoration Plan', due_date: isoDate(6), submitted: false, grade: null, points_possible: 100 },
            { id: 'a2015', title: 'Climate Impact Essay', due_date: isoDate(12), submitted: false, grade: null, points_possible: 100 },
          ]},
      ],
    },
    {
      id: 'STU003', name: 'Devon Okafor', email: 'd.okafor@truman.edu',
      major: 'Business Administration', year: 2, gpa: 3.1, advisor_id: 'ADV001',
      avatar_initials: 'DO',
      risk_score: 36, risk_level: 'medium', risk_flags: ['missed_assignment'],
      risk_history: buildHistory(25, 36, 3.0),
      shap_explanation: buildShap('medium'), projected_score_7d: 40, trend: 'deteriorating',
      will_cross_critical: false, last_updated: isoDate(0),
      courses: [
        { id: 'c301', name: 'Principles of Marketing', code: 'BUS 245', credits: 3,
          current_grade: 78.5, instructor: 'Dr. Angela Foster',
          assignments: [
            { id: 'a3001', title: 'Market Research Problem Set', due_date: isoDate(-12), submitted: true, grade: 79.0, points_possible: 100 },
            { id: 'a3002', title: 'Consumer Behavior Case', due_date: isoDate(-7), submitted: true, grade: 76.0, points_possible: 100 },
            { id: 'a3003', title: 'Brand Strategy Deck', due_date: isoDate(-3), submitted: false, grade: null, points_possible: 100 },
            { id: 'a3004', title: 'Digital Marketing Campaign', due_date: isoDate(5), submitted: false, grade: null, points_possible: 100 },
            { id: 'a3005', title: 'Marketing Analytics Report', due_date: isoDate(10), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c302', name: 'Financial Accounting', code: 'ACCT 201', credits: 3,
          current_grade: 74.2, instructor: 'Dr. Thomas Wright',
          assignments: [
            { id: 'a3006', title: 'Journal Entries Practice', due_date: isoDate(-10), submitted: true, grade: 75.0, points_possible: 100 },
            { id: 'a3007', title: 'Balance Sheet Analysis', due_date: isoDate(-5), submitted: true, grade: 72.0, points_possible: 100 },
            { id: 'a3008', title: 'Income Statement Project', due_date: isoDate(-2), submitted: true, grade: 74.0, points_possible: 100 },
            { id: 'a3009', title: 'Cash Flow Statement Quiz', due_date: isoDate(6), submitted: false, grade: null, points_possible: 50 },
            { id: 'a3010', title: 'Financial Ratios Exam', due_date: isoDate(13), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c303', name: 'Microeconomics', code: 'ECON 201', credits: 3,
          current_grade: 80.1, instructor: 'Dr. Patricia Chen',
          assignments: [
            { id: 'a3011', title: 'Supply & Demand Worksheet', due_date: isoDate(-11), submitted: true, grade: 82.0, points_possible: 100 },
            { id: 'a3012', title: 'Market Equilibrium Set', due_date: isoDate(-6), submitted: true, grade: 78.0, points_possible: 100 },
            { id: 'a3013', title: 'Elasticity Analysis', due_date: isoDate(-1), submitted: false, grade: null, points_possible: 100 },
            { id: 'a3014', title: 'Game Theory Applications', due_date: isoDate(7), submitted: false, grade: null, points_possible: 100 },
            { id: 'a3015', title: 'Market Structures Essay', due_date: isoDate(12), submitted: false, grade: null, points_possible: 100 },
          ]},
      ],
    },
    {
      id: 'STU004', name: 'Aaliyah Torres', email: 'a.torres@truman.edu',
      major: 'Psychology', year: 3, gpa: 2.9, advisor_id: 'ADV001',
      avatar_initials: 'AT',
      risk_score: 44, risk_level: 'medium', risk_flags: ['missed_assignment', 'low_grade'],
      risk_history: buildHistory(30, 44, 3.5),
      shap_explanation: buildShap('medium'), projected_score_7d: 49, trend: 'deteriorating',
      will_cross_critical: false, last_updated: isoDate(0),
      courses: [
        { id: 'c401', name: 'Cognitive Psychology', code: 'PSY 310', credits: 3,
          current_grade: 79.0, instructor: 'Dr. Rachel Green',
          assignments: [
            { id: 'a4001', title: 'Attention & Perception Lab', due_date: isoDate(-13), submitted: true, grade: 80.0, points_possible: 100 },
            { id: 'a4002', title: 'Memory Systems Report', due_date: isoDate(-8), submitted: true, grade: 78.0, points_possible: 100 },
            { id: 'a4003', title: 'Language Processing Study', due_date: isoDate(-3), submitted: true, grade: 77.0, points_possible: 100 },
            { id: 'a4004', title: 'Decision Making Case', due_date: isoDate(4), submitted: false, grade: null, points_possible: 100 },
            { id: 'a4005', title: 'Cognitive Development Paper', due_date: isoDate(11), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c402', name: 'Statistics for Behavioral Sciences', code: 'PSY 200', credits: 3,
          current_grade: 72.5, instructor: 'Dr. Steven Lee',
          assignments: [
            { id: 'a4006', title: 'Descriptive Statistics Lab', due_date: isoDate(-10), submitted: true, grade: 74.0, points_possible: 100 },
            { id: 'a4007', title: 'Hypothesis Testing Set', due_date: isoDate(-5), submitted: true, grade: 72.0, points_possible: 100 },
            { id: 'a4008', title: 'Correlation Analysis', due_date: isoDate(-2), submitted: false, grade: null, points_possible: 100 },
            { id: 'a4009', title: 'ANOVA Worksheet', due_date: isoDate(6), submitted: false, grade: null, points_possible: 50 },
            { id: 'a4010', title: 'Regression Analysis Exam', due_date: isoDate(13), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c403', name: 'Research Methods', code: 'PSY 300', credits: 3,
          current_grade: 76.3, instructor: 'Dr. Amanda Collins',
          assignments: [
            { id: 'a4011', title: 'Experimental Design Quiz', due_date: isoDate(-11), submitted: true, grade: 78.0, points_possible: 100 },
            { id: 'a4012', title: 'Literature Review Draft', due_date: isoDate(-6), submitted: true, grade: 74.0, points_possible: 100 },
            { id: 'a4013', title: 'Survey Methodology Report', due_date: isoDate(-1), submitted: false, grade: null, points_possible: 100 },
            { id: 'a4014', title: 'Data Collection Plan', due_date: isoDate(7), submitted: false, grade: null, points_possible: 100 },
            { id: 'a4015', title: 'Final Research Proposal', due_date: isoDate(14), submitted: false, grade: null, points_possible: 100 },
          ]},
      ],
    },
    {
      id: 'STU005', name: 'Elijah Russo', email: 'e.russo@truman.edu',
      major: 'Mathematics', year: 4, gpa: 2.4, advisor_id: 'ADV001',
      avatar_initials: 'ER',
      risk_score: 63, risk_level: 'high', risk_flags: ['missed_assignment', 'low_grade', 'grade_drop'],
      risk_history: buildHistory(45, 63, 4.0),
      shap_explanation: buildShap('high'), projected_score_7d: 68, trend: 'deteriorating',
      will_cross_critical: true, last_updated: isoDate(0),
      courses: [
        { id: 'c501', name: 'Abstract Algebra', code: 'MATH 411', credits: 3,
          current_grade: 62.8, instructor: 'Dr. William Chen',
          assignments: [
            { id: 'a5001', title: 'Group Theory Problem Set', due_date: isoDate(-12), submitted: true, grade: 65.0, points_possible: 100 },
            { id: 'a5002', title: 'Ring Homomorphism Proofs', due_date: isoDate(-8), submitted: false, grade: null, points_possible: 100 },
            { id: 'a5003', title: 'Field Extension Analysis', due_date: isoDate(-3), submitted: false, grade: null, points_possible: 100 },
            { id: 'a5004', title: 'Galois Theory Applications', due_date: isoDate(5), submitted: false, grade: null, points_possible: 100 },
            { id: 'a5005', title: 'Isomorphism Theorems Exam', due_date: isoDate(12), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c502', name: 'Real Analysis', code: 'MATH 415', credits: 3,
          current_grade: 58.3, instructor: 'Dr. Elizabeth Novak',
          assignments: [
            { id: 'a5006', title: 'Sequence Convergence Proofs', due_date: isoDate(-10), submitted: true, grade: 62.0, points_possible: 100 },
            { id: 'a5007', title: 'Continuity & Limits Set', due_date: isoDate(-5), submitted: true, grade: 58.0, points_possible: 100 },
            { id: 'a5008', title: 'Metric Spaces Lab', due_date: isoDate(-2), submitted: false, grade: null, points_possible: 100 },
            { id: 'a5009', title: 'Compactness Theorem Proofs', due_date: isoDate(7), submitted: false, grade: null, points_possible: 100 },
            { id: 'a5010', title: 'Integration Theory Exam', due_date: isoDate(14), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c503', name: 'Probability & Statistics', code: 'MATH 345', credits: 3,
          current_grade: 68.5, instructor: 'Dr. Daniel Kim',
          assignments: [
            { id: 'a5011', title: 'Probability Distributions', due_date: isoDate(-11), submitted: true, grade: 70.0, points_possible: 100 },
            { id: 'a5012', title: 'Expected Value Problem Set', due_date: isoDate(-6), submitted: true, grade: 67.0, points_possible: 100 },
            { id: 'a5013', title: 'Central Limit Theorem Lab', due_date: isoDate(-1), submitted: false, grade: null, points_possible: 100 },
            { id: 'a5014', title: 'Bayesian Inference Project', due_date: isoDate(8), submitted: false, grade: null, points_possible: 100 },
            { id: 'a5015', title: 'Statistical Modeling Report', due_date: isoDate(13), submitted: false, grade: null, points_possible: 100 },
          ]},
      ],
    },
    {
      id: 'STU006', name: 'Simone Nakamura', email: 's.nakamura@truman.edu',
      major: 'Chemistry', year: 1, gpa: 2.6, advisor_id: 'ADV001',
      avatar_initials: 'SN',
      risk_score: 69, risk_level: 'high', risk_flags: ['missed_assignment', 'low_grade', 'absence_streak'],
      risk_history: buildHistory(50, 69, 3.5),
      shap_explanation: buildShap('high'), projected_score_7d: 74, trend: 'deteriorating',
      will_cross_critical: true, last_updated: isoDate(0),
      courses: [
        { id: 'c601', name: 'General Chemistry II', code: 'CHEM 152', credits: 4,
          current_grade: 61.0, instructor: 'Dr. Gregory Olsen',
          assignments: [
            { id: 'a6001', title: 'Thermodynamics Problem Set', due_date: isoDate(-13), submitted: true, grade: 63.0, points_possible: 100 },
            { id: 'a6002', title: 'Equilibrium Lab Report', due_date: isoDate(-8), submitted: true, grade: 60.0, points_possible: 100 },
            { id: 'a6003', title: 'Kinetics Reaction Lab', due_date: isoDate(-3), submitted: false, grade: null, points_possible: 100 },
            { id: 'a6004', title: 'Entropy Calculations', due_date: isoDate(4), submitted: false, grade: null, points_possible: 100 },
            { id: 'a6005', title: 'Phase Equilibria Exam', due_date: isoDate(11), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c602', name: 'Analytical Chemistry', code: 'CHEM 222', credits: 4,
          current_grade: 64.7, instructor: 'Dr. Karen White',
          assignments: [
            { id: 'a6006', title: 'Titration Lab Report', due_date: isoDate(-10), submitted: true, grade: 66.0, points_possible: 100 },
            { id: 'a6007', title: 'Chromatography Analysis', due_date: isoDate(-5), submitted: false, grade: null, points_possible: 100 },
            { id: 'a6008', title: 'Spectrophotometry Lab', due_date: isoDate(-2), submitted: false, grade: null, points_possible: 100 },
            { id: 'a6009', title: 'Electrochemistry Set', due_date: isoDate(6), submitted: false, grade: null, points_possible: 50 },
            { id: 'a6010', title: 'Instrumental Analysis', due_date: isoDate(13), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c603', name: 'Calculus II', code: 'MATH 199', credits: 4,
          current_grade: 70.2, instructor: 'Dr. Linda Zhao',
          assignments: [
            { id: 'a6011', title: 'Integration Techniques', due_date: isoDate(-11), submitted: true, grade: 72.0, points_possible: 100 },
            { id: 'a6012', title: 'Series Convergence Set', due_date: isoDate(-6), submitted: true, grade: 68.0, points_possible: 100 },
            { id: 'a6013', title: 'Parametric Equations Lab', due_date: isoDate(-1), submitted: false, grade: null, points_possible: 100 },
            { id: 'a6014', title: 'Polar Coordinates Quiz', due_date: isoDate(7), submitted: false, grade: null, points_possible: 50 },
            { id: 'a6015', title: 'Taylor Series Exam', due_date: isoDate(12), submitted: false, grade: null, points_possible: 100 },
          ]},
      ],
    },
    {
      id: 'STU007', name: 'Jordan Hayes', email: 'j.hayes@truman.edu',
      major: 'Computer Science', year: 2, gpa: 1.9, advisor_id: 'ADV001',
      avatar_initials: 'JH',
      risk_score: 81, risk_level: 'critical', risk_flags: ['missed_assignment', 'low_grade', 'grade_drop', 'absence_streak'],
      risk_history: buildHistory(55, 81, 4.5),
      shap_explanation: buildShap('critical'), projected_score_7d: 87, trend: 'deteriorating',
      will_cross_critical: true, last_updated: isoDate(0),
      courses: [
        { id: 'c701', name: 'Object-Oriented Programming', code: 'CS 250', credits: 3,
          current_grade: 48.2, instructor: 'Dr. David Park',
          assignments: [
            { id: 'a7001', title: 'Inheritance & Polymorphism', due_date: isoDate(-12), submitted: true, grade: 55.0, points_possible: 100 },
            { id: 'a7002', title: 'Design Patterns Lab', due_date: isoDate(-8), submitted: false, grade: null, points_possible: 100 },
            { id: 'a7003', title: 'Exception Handling Project', due_date: isoDate(-4), submitted: false, grade: null, points_possible: 100 },
            { id: 'a7004', title: 'Unit Testing Workshop', due_date: isoDate(-1), submitted: false, grade: null, points_possible: 100 },
            { id: 'a7005', title: 'Final Software Project', due_date: isoDate(10), submitted: false, grade: null, points_possible: 200 },
          ]},
        { id: 'c702', name: 'Calculus II', code: 'MATH 199', credits: 4,
          current_grade: 44.5, instructor: 'Dr. Linda Zhao',
          assignments: [
            { id: 'a7006', title: 'Integration Techniques', due_date: isoDate(-11), submitted: true, grade: 50.0, points_possible: 100 },
            { id: 'a7007', title: 'Series Convergence Set', due_date: isoDate(-6), submitted: false, grade: null, points_possible: 100 },
            { id: 'a7008', title: 'Parametric Equations Lab', due_date: isoDate(-3), submitted: false, grade: null, points_possible: 100 },
            { id: 'a7009', title: 'Polar Coordinates Quiz', due_date: isoDate(5), submitted: false, grade: null, points_possible: 100 },
            { id: 'a7010', title: 'Taylor Series Exam', due_date: isoDate(14), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c703', name: 'Technical Writing', code: 'ENG 210', credits: 3,
          current_grade: 56.8, instructor: 'Dr. Amanda Collins',
          assignments: [
            { id: 'a7011', title: 'Technical Report Draft', due_date: isoDate(-13), submitted: true, grade: 58.0, points_possible: 100 },
            { id: 'a7012', title: 'Documentation Review', due_date: isoDate(-7), submitted: false, grade: null, points_possible: 100 },
            { id: 'a7013', title: 'API Documentation Project', due_date: isoDate(-2), submitted: false, grade: null, points_possible: 100 },
            { id: 'a7014', title: 'User Manual Assignment', due_date: isoDate(6), submitted: false, grade: null, points_possible: 100 },
            { id: 'a7015', title: 'Final Portfolio', due_date: isoDate(12), submitted: false, grade: null, points_possible: 100 },
          ]},
      ],
    },
    {
      id: 'STU008', name: 'Fatima Al-Hassan', email: 'f.alhassan@truman.edu',
      major: 'Biology', year: 3, gpa: 1.7, advisor_id: 'ADV001',
      avatar_initials: 'FA',
      risk_score: 88, risk_level: 'critical', risk_flags: ['missed_assignment', 'low_grade', 'grade_drop', 'absence_streak', 'course_overload'],
      risk_history: buildHistory(55, 88, 4.0),
      shap_explanation: buildShap('critical'), projected_score_7d: 93, trend: 'deteriorating',
      will_cross_critical: true, last_updated: isoDate(0),
      courses: [
        { id: 'c801', name: 'Cell Biology', code: 'BIOL 340', credits: 3,
          current_grade: 52.3, instructor: 'Dr. Maria Santos',
          assignments: [
            { id: 'a8001', title: 'Cell Membrane Lab', due_date: isoDate(-12), submitted: true, grade: 56.0, points_possible: 100 },
            { id: 'a8002', title: 'Mitosis & Meiosis Report', due_date: isoDate(-7), submitted: false, grade: null, points_possible: 100 },
            { id: 'a8003', title: 'Signal Transduction', due_date: isoDate(-3), submitted: false, grade: null, points_possible: 100 },
            { id: 'a8004', title: 'Gene Regulation Case', due_date: isoDate(4), submitted: false, grade: null, points_possible: 100 },
            { id: 'a8005', title: 'Cell Cycle Analysis Paper', due_date: isoDate(11), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c802', name: 'Organic Chemistry I', code: 'CHEM 331', credits: 4,
          current_grade: 44.8, instructor: 'Dr. Robert Hayes',
          assignments: [
            { id: 'a8006', title: 'Functional Groups Quiz', due_date: isoDate(-10), submitted: true, grade: 48.0, points_possible: 100 },
            { id: 'a8007', title: 'Stereochemistry Lab', due_date: isoDate(-5), submitted: false, grade: null, points_possible: 100 },
            { id: 'a8008', title: 'Reaction Mechanisms Set', due_date: isoDate(-2), submitted: false, grade: null, points_possible: 100 },
            { id: 'a8009', title: 'Substitution Reactions', due_date: isoDate(-1), submitted: false, grade: null, points_possible: 100 },
            { id: 'a8010', title: 'Organic Synthesis Exam', due_date: isoDate(8), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c803', name: 'Biostatistics', code: 'BIOL 275', credits: 3,
          current_grade: 55.1, instructor: 'Dr. Steven Lee',
          assignments: [
            { id: 'a8011', title: 'Descriptive Stats Lab', due_date: isoDate(-13), submitted: true, grade: 58.0, points_possible: 100 },
            { id: 'a8012', title: 'Probability Distributions', due_date: isoDate(-8), submitted: true, grade: 54.0, points_possible: 100 },
            { id: 'a8013', title: 'Hypothesis Testing Set', due_date: isoDate(-3), submitted: false, grade: null, points_possible: 100 },
            { id: 'a8014', title: 'Regression Analysis Lab', due_date: isoDate(5), submitted: false, grade: null, points_possible: 100 },
            { id: 'a8015', title: 'Biostatistics Final Exam', due_date: isoDate(12), submitted: false, grade: null, points_possible: 100 },
          ]},
      ],
    },
    {
      id: 'STU009', name: 'Liam Patterson', email: 'l.patterson@truman.edu',
      major: 'English', year: 4, gpa: 2.8, advisor_id: 'ADV001',
      avatar_initials: 'LP',
      risk_score: 42, risk_level: 'medium', risk_flags: ['missed_assignment', 'low_grade'],
      risk_history: buildHistory(30, 42, 3.0),
      shap_explanation: buildShap('medium'), projected_score_7d: 46, trend: 'deteriorating',
      will_cross_critical: false, last_updated: isoDate(0),
      courses: [
        { id: 'c901', name: 'American Literature', code: 'ENG 350', credits: 3,
          current_grade: 74.0, instructor: 'Dr. Catherine Moore',
          assignments: [
            { id: 'a9001', title: 'Modernism Essay', due_date: isoDate(-12), submitted: true, grade: 76.0, points_possible: 100 },
            { id: 'a9002', title: 'Harlem Renaissance Paper', due_date: isoDate(-7), submitted: true, grade: 72.0, points_possible: 100 },
            { id: 'a9003', title: 'Post-War Fiction Analysis', due_date: isoDate(-2), submitted: false, grade: null, points_possible: 100 },
            { id: 'a9004', title: 'Contemporary Voices Essay', due_date: isoDate(6), submitted: false, grade: null, points_possible: 100 },
            { id: 'a9005', title: 'Capstone Literary Review', due_date: isoDate(14), submitted: false, grade: null, points_possible: 200 },
          ]},
        { id: 'c902', name: 'Creative Writing', code: 'ENG 380', credits: 3,
          current_grade: 81.0, instructor: 'Dr. Mark Sullivan',
          assignments: [
            { id: 'a9006', title: 'Short Story Draft', due_date: isoDate(-10), submitted: true, grade: 82.0, points_possible: 100 },
            { id: 'a9007', title: 'Poetry Portfolio', due_date: isoDate(-5), submitted: true, grade: 80.0, points_possible: 100 },
            { id: 'a9008', title: 'Flash Fiction Set', due_date: isoDate(-1), submitted: true, grade: 81.0, points_possible: 100 },
            { id: 'a9009', title: 'Narrative Structure Lab', due_date: isoDate(7), submitted: false, grade: null, points_possible: 100 },
            { id: 'a9010', title: 'Final Creative Piece', due_date: isoDate(13), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c903', name: 'Philosophy of Language', code: 'PHIL 310', credits: 3,
          current_grade: 68.5, instructor: 'Dr. James Turner',
          assignments: [
            { id: 'a9011', title: 'Wittgenstein Response', due_date: isoDate(-11), submitted: true, grade: 70.0, points_possible: 100 },
            { id: 'a9012', title: 'Speech Act Theory Paper', due_date: isoDate(-6), submitted: true, grade: 67.0, points_possible: 100 },
            { id: 'a9013', title: 'Pragmatics Discussion', due_date: isoDate(-1), submitted: false, grade: null, points_possible: 100 },
            { id: 'a9014', title: 'Meaning & Reference Essay', due_date: isoDate(8), submitted: false, grade: null, points_possible: 100 },
            { id: 'a9015', title: 'Final Philosophy Paper', due_date: isoDate(12), submitted: false, grade: null, points_possible: 100 },
          ]},
      ],
    },
    {
      id: 'STU010', name: 'Zara Patel', email: 'z.patel@truman.edu',
      major: 'Engineering', year: 1, gpa: 3.8, advisor_id: 'ADV001',
      avatar_initials: 'ZP',
      risk_score: 8, risk_level: 'low', risk_flags: [],
      risk_history: buildHistory(6, 8, 1.5),
      shap_explanation: buildShap('low'), projected_score_7d: 9, trend: 'stable',
      will_cross_critical: false, last_updated: isoDate(0),
      courses: [
        { id: 'c1001', name: 'Introduction to Engineering', code: 'ENGR 101', credits: 3,
          current_grade: 96.0, instructor: 'Dr. Kevin Wu',
          assignments: [
            { id: 'a10001', title: 'Design Thinking Lab', due_date: isoDate(-12), submitted: true, grade: 97.0, points_possible: 100 },
            { id: 'a10002', title: 'CAD Modeling Project', due_date: isoDate(-8), submitted: true, grade: 95.0, points_possible: 100 },
            { id: 'a10003', title: 'Materials Analysis', due_date: isoDate(-3), submitted: true, grade: 96.0, points_possible: 100 },
            { id: 'a10004', title: 'Sustainability Report', due_date: isoDate(5), submitted: false, grade: null, points_possible: 100 },
            { id: 'a10005', title: 'Team Bridge Project', due_date: isoDate(12), submitted: false, grade: null, points_possible: 200 },
          ]},
        { id: 'c1002', name: 'Physics I', code: 'PHYS 195', credits: 4,
          current_grade: 93.5, instructor: 'Dr. Elizabeth Novak',
          assignments: [
            { id: 'a10006', title: 'Kinematics Problem Set', due_date: isoDate(-10), submitted: true, grade: 94.0, points_possible: 100 },
            { id: 'a10007', title: 'Newton\'s Laws Lab', due_date: isoDate(-5), submitted: true, grade: 93.0, points_possible: 100 },
            { id: 'a10008', title: 'Energy Conservation', due_date: isoDate(-1), submitted: true, grade: 94.0, points_possible: 100 },
            { id: 'a10009', title: 'Rotational Dynamics', due_date: isoDate(7), submitted: false, grade: null, points_possible: 100 },
            { id: 'a10010', title: 'Oscillations & Waves Exam', due_date: isoDate(14), submitted: false, grade: null, points_possible: 100 },
          ]},
        { id: 'c1003', name: 'Calculus I', code: 'MATH 198', credits: 4,
          current_grade: 91.2, instructor: 'Dr. Linda Zhao',
          assignments: [
            { id: 'a10011', title: 'Limits & Continuity', due_date: isoDate(-11), submitted: true, grade: 92.0, points_possible: 100 },
            { id: 'a10012', title: 'Derivatives Practice', due_date: isoDate(-6), submitted: true, grade: 90.0, points_possible: 100 },
            { id: 'a10013', title: 'Applications of Derivatives', due_date: isoDate(-1), submitted: true, grade: 91.0, points_possible: 100 },
            { id: 'a10014', title: 'Integration Intro Quiz', due_date: isoDate(6), submitted: false, grade: null, points_possible: 50 },
            { id: 'a10015', title: 'Integration Techniques Exam', due_date: isoDate(13), submitted: false, grade: null, points_possible: 100 },
          ]},
      ],
    },
  ]
}

// ── Mutable state ────────────────────────────────────────────────
let _students: Student[] = buildStudents()
let _ingestionPaused = false

function scoreToLevel(score: number) {
  if (score <= 25) return 'low' as const
  if (score <= 50) return 'medium' as const
  if (score <= 75) return 'high' as const
  return 'critical' as const
}

// ── Public API (mirrors backend) ─────────────────────────────────
export const mockDb = {
  getStudents: (): Student[] => [..._students],

  getStudent: (id: string): Student | undefined => _students.find(s => s.id === id),

  getTimeline: (id: string): TimelineItem[] => {
    const s = _students.find(st => st.id === id)
    if (!s) return []
    const items: TimelineItem[] = []
    for (const c of s.courses) {
      for (const a of c.assignments) {
        const dueDate = new Date(a.due_date)
        const now = new Date()
        const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        let status: TimelineItem['status'] = 'upcoming'
        if (a.submitted) status = 'completed'
        else if (daysUntilDue < 0) status = 'overdue'
        else if (daysUntilDue <= 3) status = 'due_soon'
        items.push({
          assignment_id: a.id, title: a.title, course_name: c.name, course_code: c.code,
          due_date: a.due_date, submitted: a.submitted, grade: a.grade,
          days_until_due: daysUntilDue, status,
        })
      }
    }
    items.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    return items
  },

  getRiskProjection: (id: string): Projection => {
    const s = _students.find(st => st.id === id)
    if (!s) return { trend: 'stable', slope: 0, projected_score_7d: null, will_cross_critical: false, projected_points: [] }
    const baseScore = s.risk_score
    const slope = s.trend === 'deteriorating' ? 1.2 : s.trend === 'improving' ? -0.8 : 0.2
    const points = Array.from({ length: 8 }, (_, i) => ({
      day: i,
      score: Math.max(0, Math.min(100, Math.round((baseScore + slope * i) * 10) / 10)),
    }))
    return {
      trend: s.trend, slope,
      projected_score_7d: s.projected_score_7d,
      will_cross_critical: s.will_cross_critical,
      projected_points: points,
    }
  },

  getRiskDistribution: (): RiskDistribution => {
    const dist = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const s of _students) dist[s.risk_level]++
    return dist
  },

  postEvent: (body: { student_id: string; event_type: string; payload: Record<string, unknown> }): { student: Student; delta: number } | null => {
    const s = _students.find(st => st.id === body.student_id)
    if (!s) return null
    const oldScore = s.risk_score
    if (body.event_type === 'grade_drop') {
      const courseId = (body.payload.course_id as string) || s.courses[0]?.id
      const newGrade = (body.payload.new_grade as number) ?? 45
      const course = s.courses.find(c => c.id === courseId)
      if (course) course.current_grade = newGrade
      s.risk_score = Math.min(100, s.risk_score + 8 + Math.random() * 7)
      s.risk_flags = Array.from(new Set([...s.risk_flags, 'grade_drop']))
    } else if (body.event_type === 'missed_assignment') {
      s.risk_score = Math.min(100, s.risk_score + 5 + Math.random() * 3)
      s.risk_flags = Array.from(new Set([...s.risk_flags, 'missed_assignment']))
    }
    s.risk_score = Math.round(s.risk_score * 10) / 10
    s.risk_level = scoreToLevel(s.risk_score)
    s.last_updated = new Date().toISOString()
    s.risk_history = [...s.risk_history, { timestamp: s.last_updated, score: s.risk_score }].slice(-30)
    s.shap_explanation = buildShap(s.risk_level)
    s.projected_score_7d = Math.min(100, Math.round((s.risk_score + 5) * 10) / 10)
    s.trend = 'deteriorating'
    s.will_cross_critical = s.risk_score >= 60
    return { student: s, delta: s.risk_score - oldScore }
  },

  reset: () => {
    _students = buildStudents()
    _ingestionPaused = false
  },

  getIngestionPaused: () => _ingestionPaused,
  setIngestionPaused: (v: boolean) => { _ingestionPaused = v },

  // Simulate a random autonomous ingestion event
  simulateIngestionEvent: (): { student: Student; oldScore: number; description: string } | null => {
    if (_ingestionPaused) return null
    const candidates = _students.filter(s => s.risk_score < 95)
    if (candidates.length === 0) return null
    const s = candidates[Math.floor(Math.random() * candidates.length)]
    const oldScore = s.risk_score
    const events = [
      { desc: `Missed assignment detected in ${s.courses[0]?.code || 'unknown course'}`, delta: 3 + Math.random() * 4 },
      { desc: `Late submission flagged in ${s.courses[Math.floor(Math.random() * s.courses.length)]?.code}`, delta: 2 + Math.random() * 3 },
      { desc: `Login activity below threshold for ${s.name}`, delta: 1 + Math.random() * 2 },
      { desc: `LMS engagement drop detected for ${s.name}`, delta: 2 + Math.random() * 3 },
    ]
    const event = events[Math.floor(Math.random() * events.length)]
    s.risk_score = Math.min(100, Math.round((s.risk_score + event.delta) * 10) / 10)
    s.risk_level = scoreToLevel(s.risk_score)
    s.last_updated = new Date().toISOString()
    s.risk_history = [...s.risk_history, { timestamp: s.last_updated, score: s.risk_score }].slice(-30)
    s.shap_explanation = buildShap(s.risk_level)
    s.projected_score_7d = Math.min(100, Math.round((s.risk_score + 4) * 10) / 10)
    s.will_cross_critical = s.risk_score >= 60
    if (s.risk_score > oldScore + 3) s.trend = 'deteriorating'
    return { student: s, oldScore, description: event.desc }
  },
}

// ── Demo Accounts ────────────────────────────────────────────────
export const DEMO_ACCOUNTS: Record<string, { password: string; user_type: string; user_id: string; name: string }> = {
  's.chen@truman.edu': { password: 'demo1234', user_type: 'advisor', user_id: 'ADV001', name: 'Dr. Sarah Chen' },
  'm.webb@truman.edu': { password: 'demo1234', user_type: 'student', user_id: 'STU001', name: 'Marcus Webb' },
  'p.nair@truman.edu': { password: 'demo1234', user_type: 'student', user_id: 'STU002', name: 'Priya Nair' },
  'd.okafor@truman.edu': { password: 'demo1234', user_type: 'student', user_id: 'STU003', name: 'Devon Okafor' },
  'a.torres@truman.edu': { password: 'demo1234', user_type: 'student', user_id: 'STU004', name: 'Aaliyah Torres' },
  'e.russo@truman.edu': { password: 'demo1234', user_type: 'student', user_id: 'STU005', name: 'Elijah Russo' },
  's.nakamura@truman.edu': { password: 'demo1234', user_type: 'student', user_id: 'STU006', name: 'Simone Nakamura' },
  'j.hayes@truman.edu': { password: 'demo1234', user_type: 'student', user_id: 'STU007', name: 'Jordan Hayes' },
  'f.alhassan@truman.edu': { password: 'demo1234', user_type: 'student', user_id: 'STU008', name: 'Fatima Al-Hassan' },
  'l.patterson@truman.edu': { password: 'demo1234', user_type: 'student', user_id: 'STU009', name: 'Liam Patterson' },
  'z.patel@truman.edu': { password: 'demo1234', user_type: 'student', user_id: 'STU010', name: 'Zara Patel' },
}

export const DEMO_ACCOUNTS_LIST: DemoAccount[] = Object.entries(DEMO_ACCOUNTS).map(([email, info]) => ({
  email, name: info.name, role: info.user_type, user_id: info.user_id,
}))

// ── Template AI Content ──────────────────────────────────────────
export function generateNudgeMessage(studentId: string): { student_id: string; message: string; generated_at: string } {
  const s = mockDb.getStudent(studentId)
  const name = s?.name?.split(' ')[0] || 'Student'
  const messages = [
    `Hey ${name}, I noticed you might have some upcoming deadlines. Just wanted to check in — is there anything I can help with? Remember, your advisor Dr. Chen is available during office hours (TTh 2-4pm) if you want to chat. You've got this! 💪`,
    `Hi ${name}! Heads up — it looks like you have a few assignments that could use attention. No pressure, just making sure you're aware. The tutoring center in Pickler Memorial Library is a great resource if you need extra support. Let me know how I can help!`,
    `${name}, quick friendly nudge — your recent engagement patterns suggest you might benefit from connecting with some campus resources. The Academic Success Center offers free study skills workshops every Wednesday. Would you like me to schedule something?`,
  ]
  return {
    student_id: studentId,
    message: messages[Math.floor(Math.random() * messages.length)],
    generated_at: new Date().toISOString(),
  }
}

export function generateAdvisorEmail(studentId: string): { student_id: string; subject: string; body: string; generated_at: string } {
  const s = mockDb.getStudent(studentId)
  const name = s?.name || 'Unknown Student'
  const riskScore = s?.risk_score ?? 0
  const level = s?.risk_level ?? 'low'
  const major = s?.major || 'Undeclared'
  const courses = s?.courses.map(c => `${c.code} (${c.current_grade.toFixed(1)}%)`).join(', ') || 'N/A'
  const flags = s?.risk_flags.length ? s.risk_flags.join(', ') : 'none'

  return {
    student_id: studentId,
    subject: `⚠️ Intervention Alert: ${name} — Risk Level ${level.toUpperCase()} (${riskScore.toFixed(1)}%)`,
    body: `Dear Dr. Chen,

This is an automated alert from the FLARE Early Warning System regarding ${name}, a ${major} major currently enrolled in ${s?.courses.length || 0} courses.

RISK ASSESSMENT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━
• Current Risk Score: ${riskScore.toFixed(1)} / 100 (${level.toUpperCase()})
• 7-Day Projected Score: ${s?.projected_score_7d?.toFixed(1) ?? 'N/A'}
• Trend: ${s?.trend || 'stable'}
• Active Flags: ${flags}

CURRENT ENROLLMENT
━━━━━━━━━━━━━━━━━━━━━━
${courses}

KEY RISK FACTORS
━━━━━━━━━━━━━━━━━━━━━━
${s?.shap_explanation.filter(e => e.direction === 'risk').slice(0, 3).map(e => `• ${e.human_label} (impact: +${(e.shap * 100).toFixed(0)}%)`).join('\n') || '• No significant risk factors identified'}

RECOMMENDED ACTIONS
━━━━━━━━━━━━━━━━━━━━━━
1. Schedule a one-on-one check-in within the next 48 hours
2. Connect ${name.split(' ')[0]} with tutoring resources for struggling courses
3. Review course load and discuss potential adjustments
4. Document this outreach in the student's advising notes

This alert was generated by FLARE's ML-powered risk assessment engine using gradient boosting on 7 behavioral signals. The model was trained on 3,000 historical student records with an estimated AUC of ~0.80.

Best regards,
FLARE Retention Intelligence System
Truman State University`,
    generated_at: new Date().toISOString(),
  }
}
