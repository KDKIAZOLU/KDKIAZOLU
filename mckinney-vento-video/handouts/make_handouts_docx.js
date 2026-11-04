// Builds McKinney-Vento-PD-Handouts.docx: an editable Word version of handouts.html
// with the same pages, colors and layout (tables stand in for the HTML grids).
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
  WidthType, BorderStyle, ShadingType, HeightRule, VerticalAlign, TableLayoutType,
} = require("docx");

const NAVY = "0B2545", GOLD = "F2A900", LINE = "9AA5B4", SOFT = "EEF2F7", MUTED = "333333";
const FONT = "Inter";
const W = 10800; // 7.5 in content width (Letter, 0.5 in margins)
const pt = (n) => Math.round(n * 2); // half-points
const IN = 1440;

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: pt(o.pt ?? 11.5), color: o.color ?? "111111", bold: o.bold, italics: o.italics, allCaps: o.caps, characterSpacing: o.spacing });
const para = (runs, o = {}) => {
  const spacing = { before: 0, after: o.after ?? 0, ...(o.spacingExtra || {}) };
  if (o.line) Object.assign(spacing, { line: o.line, lineRule: "exact" });
  else Object.assign(spacing, { line: 276, lineRule: "auto" });
  return new Paragraph({ children: [].concat(runs), spacing, alignment: o.align, border: o.border, shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined, indent: o.indent, pageBreakBefore: o.pageBreak, keepNext: o.keepNext });
};

const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NB = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
const solid = (size, color) => ({ style: BorderStyle.SINGLE, size, color });
const dashed = { style: BorderStyle.DASHED, size: 6, color: "777777" };
const all = (b) => ({ top: b, bottom: b, left: b, right: b });

const cell = (children, width, o = {}) => new TableCell({
  children: children.length ? children : [para([])],
  width: { size: width, type: WidthType.DXA },
  borders: o.borders ?? all(none),
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
  margins: o.margins ?? { top: 0, bottom: 0, left: 0, right: 0 },
  verticalAlign: o.valign,
  columnSpan: o.span,
});
const table = (widths, rows, o = {}) => new Table({
  width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: widths,
  layout: TableLayoutType.FIXED,
  borders: o.borders ?? NB,
  rows,
});
const row = (cells, h, rule = HeightRule.EXACT) => new TableRow({ children: cells, height: h ? { value: h, rule } : undefined, cantSplit: true });

// ---------- shared pieces ----------
const header = (kicker, title, first) => [
  para(t(kicker, { pt: 9, bold: true, color: NAVY, caps: true, spacing: 30 }), { pageBreak: !first }),
  para(t(title, { pt: 20, bold: true, color: NAVY }), { after: 280, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 6 } } }),
];
const blankRun = (inches) => t("_".repeat(Math.round(inches * 11)));
const lead = (runs, after = 240) => para([].concat(runs), { after });
const cutLabel = (text, first) => para(t("✂ " + text, { pt: 8.5, color: "666666" }), { after: 80, pageBreak: !first });
const tail = () => para(t("", { pt: 1 }), { line: 20 }); // tiny paragraph Word requires after a table

// Ruled writing lines as a borderless one-column table with bottom rules
const lines = (width, n, h = 440, color = LINE) => table([width], Array.from({ length: n }, () =>
  row([cell([para([])], width, { borders: { top: none, left: none, right: none, bottom: solid(4, color) } })], h)));

// Navy number badge (circled digits for 1-10, shaded letter otherwise)
const CIRCLED = ["", "❶", "❷", "❸", "❹", "❺", "❻", "❼", "❽", "❾", "❿"];
const badge = (n) => typeof n === "number"
  ? new TextRun({ text: CIRCLED[n] + " ", font: "Segoe UI Symbol", size: pt(14), color: NAVY })
  : new TextRun({ text: ` ${n} `, font: FONT, size: pt(10), bold: true, color: "FFFFFF", shading: { fill: NAVY, type: ShadingType.CLEAR, color: "auto" } });
const tag = (n, label) => para([badge(n), t(typeof n === "number" ? "" : " "), t(label, { pt: 8.5, bold: true, color: NAVY, caps: true, spacing: 20 })], { after: 120 });
const cardBody = (runs, size = 13) => para([].concat(runs).map((r) => typeof r === "string" ? t(r, { pt: size }) : r), { after: 0 });
const cardMargins = { top: 220, bottom: 160, left: 240, right: 240 };

// Grid of dashed cut-cards
const cardGrid = (cols, rowH, cards) => {
  const w = W / cols;
  const rows = [];
  for (let i = 0; i < cards.length; i += cols)
    rows.push(row(cards.slice(i, i + cols).map((c) => cell(c, w, { borders: all(dashed), margins: cardMargins })), rowH));
  return table(Array(cols).fill(w), rows);
};

// Boxed panels separated by gutters (the HTML's rounded boxes)
const GUT = 200;
const panelRow = (panels, h, gut = GUT, border = solid(16, NAVY), margins = { top: 160, bottom: 160, left: 200, right: 200 }) => {
  const n = panels.length;
  const w = (W - gut * (n - 1)) / n;
  const widths = [], cells = [];
  panels.forEach((p, i) => {
    if (i) { widths.push(gut); cells.push(cell([para([])], gut)); }
    widths.push(w);
    cells.push(cell(p, w, { borders: all(border), margins }));
  });
  return { widths, row: row(cells, h), w };
};
const panelTable = (rowsOfPanels, h, gapH = 200) => {
  const built = rowsOfPanels.map((r) => panelRow(r, h));
  const rows = [];
  built.forEach((b, i) => {
    if (i) rows.push(row(b.widths.map((w) => cell([para([])], w)), gapH));
    rows.push(b.row);
  });
  return table(built[0].widths, rows);
};

// ---------- pages ----------
const pages = [];

// 1. Note-catcher
{
  const colW = (W - 2 * GUT) / 3;
  const col = (title, prompt) => [
    para(t(title, { pt: 14, bold: true, color: "FFFFFF" }), { fill: NAVY, spacingExtra: { before: 0 }, after: 0, indent: { left: 0 } }),
    para(t(prompt, { pt: 9.5, color: MUTED }), { fill: SOFT, after: 60 }),
    lines(colW - 400, 21, 440),
  ];
  const r = panelRow([col("Notice", "Signs I might see in my classroom, office or hallway"), col("Refer", "Who I would tell, and how quickly"), col("Protect", "What I must keep private, and what must never become a barrier")], 11400, GUT, solid(16, NAVY), { top: 0, bottom: 120, left: 0, right: 0 });
  pages.push(
    ...header("McKinney-Vento PD · During the video", "Notice · Refer · Protect", true),
    para([t("Name / School: "), blankRun(2.6)], { after: 240 }),
    lead(t("While you watch, jot at least one idea in each column. You'll use these notes in the group activities.", { color: MUTED })),
    table(r.widths, [r.row]),
    para([t("City Schools McKinney-Vento Liaison: 443-642-2424 · My school's McKinney-Vento liaison: ____________________", { pt: 8.5, color: "555555" })], { spacingExtra: { before: 120 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 } } }),
  );
}

// 2–3. Agree / Disagree signs
for (const word of ["AGREE", "DISAGREE"]) {
  pages.push(
    para(t("", { pt: 2 }), { pageBreak: true, line: Math.round(3.2 * IN) }),
    para(t(word, { pt: 96, bold: true, color: NAVY }), { align: AlignmentType.CENTER, after: 0 }),
    para(t("", { pt: 8 }), { fill: GOLD, line: 200, indent: { left: W * 0.2, right: W * 0.2 }, spacingExtra: { before: 400 }, after: 400 }),
    para(t("Activity 1 · Agree / Disagree Line-Up", { pt: 18, color: MUTED }), { align: AlignmentType.CENTER }),
  );
}

// 4. Guess the Number
{
  const w = W / 2;
  const slip = () => [
    para(t("Table guess", { pt: 13, bold: true, color: NAVY }), { after: 120 }),
    para(t("How many Maryland students were identified as experiencing homelessness in 2023–24?"), { after: 60 }),
    lines(w - 480, 1, 400, "555555"),
    para(t("How many of them were in Baltimore City?"), { spacingExtra: { before: 280 }, after: 60 }),
    lines(w - 480, 1, 400, "555555"),
  ];
  pages.push(
    ...header("Activity 2 · Before the video", "Guess the Number"),
    cutLabel("Cut along the dashed lines. One slip per table.", true),
    cardGrid(2, 6000, [slip(), slip(), slip(), slip()]),
    tail(),
  );
}

// 5. Sorting mat
{
  const box = (title, sub) => [para(t(title, { pt: 14, bold: true, color: NAVY }), { after: 40 }), para(t(sub, { pt: 9.5, color: MUTED }))];
  const r = panelRow([box("Likely eligible", "Refer to the McKinney-Vento liaison"), box("Not enough information", "Refer, and let the liaison decide"), box("Likely not eligible", "Fixed, regular and adequate housing")], 9600);
  pages.push(
    ...header("Activity 4 · After the video", "Who Qualifies? Sorting Mat"),
    lead([t("Place each scenario card in a column. Remember: staff don't decide eligibility; the McKinney-Vento liaison does. ", { color: MUTED }), t("When in doubt, refer.", { bold: true, color: MUTED })]),
    table(r.widths, [r.row]),
    para(t("Discuss", { pt: 13, bold: true, color: NAVY }), { spacingExtra: { before: 280 }, after: 120 }),
    para(t("Which cards caused the most debate? Why is \"refer when unsure\" the safest rule?")),
  );
}

// 6. Scenario cards 1–10
{
  const sc = [
    "Maya's family lost their apartment after a fire. They're staying in a relative's basement.",
    "Andre's family lives in a motel because they can't afford a deposit on an apartment.",
    "Jasmine, 17, left home after conflict with her parents and is sleeping at friends' houses.",
    "The Lee family sold their house and is renting while their new home is built.",
    "Carlos and his mom sleep in their car some nights and at a shelter on others.",
    "Tiana's family moved in with her grandmother. Tiana mentions \"we had to leave our old place.\"",
    "A newly enrolled student has no records and says they're \"staying with people.\"",
    "Jordan lives in a trailer with no running water or electricity.",
    "Ethan's family sold their home and is temporarily staying in a furnished short-term rental while waiting to close on a new house.",
    "Sophia and her younger brother recently moved in with their aunt after leaving their previous residence.",
  ];
  pages.push(
    cutLabel("Activity 4 · Who Qualifies? Scenario cards: cut along the dashed lines"),
    cardGrid(2, 2720, sc.map((s, i) => [tag(i + 1, "Scenario"), cardBody(s)])),
    tail(),
  );
}

// 7. Barrier Busters
{
  const w = W / 2;
  const qs = () => ["Right at stake:", "What should happen:", "Who we contact:"].map((q) =>
    table([w - 480], [row([cell([para(t(q, { pt: 9.5, color: MUTED }))], w - 480, { borders: { top: none, left: none, right: none, bottom: solid(4, LINE) }, valign: VerticalAlign.BOTTOM })], 400)]));
  const bb = [
    "The front office tells a mother her son can't start until she brings a lease and immunization records.",
    "A student who moved to a shelter across town has missed four days because there's no way to get to school.",
    "A student can't go on a field trip because the $25 fee is overdue.",
    "A student keeps getting sent to the office for not wearing a uniform.",
    "A family and the school disagree about whether the student qualifies. The school says the student must stay home until it's resolved.",
    "A student hasn't eaten breakfast because the family hasn't filled out a meal form.",
  ];
  pages.push(
    cutLabel("Activity 5 · Barrier Busters: one card per table"),
    cardGrid(2, 4560, bb.map((s, i) => [table([w - 480], [row([cell([tag(i + 1, "Barrier"), cardBody(s)], w - 480)], 2860)]), ...qs().flatMap((q) => [q, para(t("", { pt: 1 }), { line: 20 })])])),
    tail(),
  );
}

// 8. Cross-department case cards
{
  const cases = [
    ["Ms. Rivera", " enrolls her daughter, who has an IEP from another state, after the family's apartment was condemned. The family is at a shelter. The student has had no special education services for three weeks."],
    ["Kwame, 9,", " arrived from Ghana with his father. They're staying with a church member's family. His father speaks Twi and limited English and has no school records."],
    ["Destiny,", " a senior, has been staying with friends since her mother's eviction. She wants to apply for college financial aid but can't get her parent's information."],
    ["Malik, 7,", " comes to school hungry, with untreated tooth pain, and says he's living in \"the car with Mom.\" He mentions an adult at the car hurts him when Mom isn't there."],
    ["The Thompson children", " (pre-K, 2nd grade and 6th grade) moved to a motel near the county line. The pre-K child lost her spot, and the two older siblings have missed a week."],
    ["Aaliyah, 15,", " is doubled up with a relative. She's withdrawn, says she \"doesn't see the point anymore,\" and has stopped turning in work."],
    ["Jayden,", " a junior, moved to a shelter mid-semester. He's on the varsity basketball team, is two credits behind, and was told his partial coursework from his old school \"doesn't count.\""],
    ["A family of four", " shows up at the front office the morning after losing their housing. The children have no immunization records and the parent is worried about being reported."],
  ];
  pages.push(
    cutLabel("Activity 5B · Who Else Needs to Know? Case cards: one or two per table"),
    cardGrid(2, 3400, cases.map(([n, rest], i) => [tag(i + 1, "Case"), cardBody([t(n, { pt: 11.5, bold: true }), t(rest, { pt: 11.5 })])])),
    tail(),
  );
}

// 9. Who Else Needs to Know? planning sheet
{
  const chips = ["McKinney-Vento liaison", "Counselor / social worker", "Special education / IEP team", "ESOL / English learner office", "School nurse / health services", "Transportation", "Food and nutrition services", "Attendance", "Child Protective Services (mandated report)", "School psychologist / behavioral health", "Early childhood / Pre-K", "College and career / financial aid", "Athletics and activities", "Registrar / enrollment"];
  const cg = 120, cw = (W - 3 * cg) / 4;
  const chipRows = [];
  for (let i = 0; i < chips.length; i += 4) {
    if (i) chipRows.push(row([cell([para([])], W, { span: 7 })], 120));
    const cells = [];
    for (let j = 0; j < 4; j++) {
      if (j) cells.push(cell([para([])], cg));
      const c = chips[i + j];
      cells.push(c ? cell([para(t(c, { pt: 9.5, bold: true, color: NAVY }), { align: AlignmentType.CENTER })], cw, { borders: all(solid(12, NAVY)), margins: { top: 80, bottom: 80, left: 80, right: 80 }, valign: VerticalAlign.CENTER }) : cell([para([])], cw));
    }
    chipRows.push(row(cells, 600, HeightRule.ATLEAST));
  }
  const pw = (W - GUT) / 2;
  const box = (title, hint) => [para(t(title, { pt: 13, bold: true, color: NAVY }), { after: 40 }), para(t(hint, { pt: 9, color: "444444" }), { after: 60 }), lines(pw - 400, 7, 430)];
  pages.push(
    ...header("Activity 5B · After the video", "Who Else Needs to Know?"),
    para([t("Case #: "), blankRun(0.8), t("   Table: "), blankRun(1.2)], { after: 240 }),
    lead(t("Circle every department this case needs. The McKinney-Vento liaison coordinates, but others act too. Share only the information each office needs; housing status is confidential.", { color: MUTED })),
    table([cw, cg, cw, cg, cw, cg, cw], chipRows),
    para([], { after: 200 }),
    panelTable([[box("Who acts first?", "Name the office and the first action. Is anything required today?"), box("Who else, and what do they do?", "List each department and its role")],
      [box("What does each office need to know?", "Minimum information only"), box("Where could the hand-off break down?", "And how will we prevent it?")]], 3550),
    tail(),
  );
}

// 10. Role-play
{
  const rp = [
    ["A", "A usually on-time 4th grader has been late all week, falling asleep in class, and wearing the same clothes."],
    ["B", "A 10th grader mentions they've been \"couch surfing\" and asks you not to tell anyone."],
    ["C", "A parent at pickup says they're \"between places right now\" and worried about their child changing schools."],
  ];
  const checks = ["Spoke privately, not in front of others", "Used neutral words (\"Where are you staying right now?\") rather than \"Are you homeless?\"", "Didn't promise secrecy they can't keep, but explained that information is shared only with people who can help", "Named the next step: the school's McKinney-Vento liaison", "Didn't make the student or family prove anything"];
  pages.push(
    cutLabel("Activity 6 · The Right Words: one set per group of three. Rotate roles for each scenario."),
    cardGrid(1, 2200, rp.map(([l, s]) => [tag(l, "Role-play"), cardBody(s)])),
    para(t("Observer checklist", { pt: 13, bold: true, color: NAVY }), { spacingExtra: { before: 280 }, after: 80 }),
    ...checks.map((c) => para([t("☐  ", { pt: 12 }), t(c, { pt: 10.5 })], { after: 60 })),
    para(t("Phrases that worked", { pt: 13, bold: true, color: NAVY }), { spacingExtra: { before: 200 }, after: 60 }),
    lines(W, 7, 400),
    tail(),
  );
}

// 11. School Action Map
{
  const pw = (W - GUT) / 2;
  const box = (title, hint) => [para(t(title, { pt: 13, bold: true, color: NAVY }), { after: 40 }), para(t(hint, { pt: 9, color: "444444" }), { after: 60 }), lines(pw - 400, 12, 430)];
  pages.push(
    ...header("Activity 7 · Closing", "Our School Action Map"),
    para([t("School: "), blankRun(2.6)], { after: 240 }),
    panelTable([[box("1. Our McKinney-Vento liaison", "Name, room, extension. Citywide line: 443-642-2424"), box("2. Where students might be noticed", "Front office, attendance, nurse, cafeteria, buses, coaches…")],
      [box("3. Our referral steps", "Who tells whom, how quickly, and how it stays confidential"), box("4. One barrier we'll remove this month", "Uniform closet, grab-and-go breakfast, front-office enrollment script…")]], 6050),
    tail(),
  );
}

// 12. Exit tickets
{
  const lw = W - 480;
  const ln = (n) => table([360, lw - 360], [row([
    cell([para(t(String(n), { pt: 13, bold: true, color: NAVY }))], 360, { valign: VerticalAlign.BOTTOM }),
    cell([para([])], lw - 360, { borders: { top: none, left: none, right: none, bottom: solid(4, "555555") } }),
  ], 330)]);
  const lbl = (n, text) => para([t(n + " ", { bold: true }), t(text, { pt: 10.5 })], { spacingExtra: { before: 100 }, after: 0 });
  const ticket = () => [
    para(t("3-2-1 Exit Ticket", { pt: 13, bold: true, color: NAVY }), { after: 60 }),
    lbl("3", "signs a student might be experiencing homelessness"), ln(1), ln(2), ln(3),
    lbl("2", "rights a student has under McKinney-Vento"), ln(1), ln(2),
    lbl("1", "person at my school I'll contact"), ln(1),
  ];
  pages.push(
    cutLabel("Activity 8 · 3-2-1 Exit Ticket: three per page"),
    table([W], [ticket(), ticket(), ticket()].map((c) => row([cell(c, W, { borders: all(dashed), margins: { top: 140, bottom: 100, left: 240, right: 240 } })], 4500))),
    tail(),
  );
}

// Answer-key tables
const kb = solid(4, "BBBBBB");
const keyTable = (widths, head, body) => table(widths, [
  row(head.map((h, i) => cell([para(t(h, { pt: 10, bold: true, color: NAVY }), { line: 250 })], widths[i], { borders: all(kb), fill: SOFT, margins: { top: 60, bottom: 60, left: 100, right: 100 } }))),
  ...body.map((r) => row(r.map((c, i) => cell([para(t(c, { pt: 10 }), { line: 250 })], widths[i], { borders: all(kb), margins: { top: 60, bottom: 60, left: 100, right: 100 } })))),
]);
const h2 = (text) => para(t(text, { pt: 13, bold: true, color: NAVY }), { spacingExtra: { before: 200 }, after: 100 });

// 13. Answer key
pages.push(
  ...header("Facilitator only · do not distribute", "Answer Key"),
  h2("Activity 1 · Agree / Disagree statements"),
  keyTable([6200, 4600], ["Statement", "Answer"], [
    ["1. A student living with their aunt's family because they were evicted counts as homeless under federal law.", "Agree: doubled up because of lost housing"],
    ["2. A school can wait to enroll a student until the family brings proof of address.", "Disagree: enrollment is immediate, even without records"],
    ["3. A student who moves to a shelter across the city has to change schools.", "Disagree: can stay in school of origin when in their best interest, with transportation"],
    ["4. Teachers should tell the class when a student is homeless, so classmates can help.", "Disagree: housing status is confidential"],
    ["5. A 16-year-old living on their own, without a parent, can enroll themselves in school.", "Agree: unaccompanied youth are covered and enrolled right away"],
  ]),
  h2("Activity 2 · Guess the Number"),
  para(t("20,402 statewide; 5,732 in Baltimore City (MSDE, 2023–24). That's more than 1 in 4 of the state total and about 1 in 13 City Schools students, or about 38 students in a school of 500.", { pt: 11 })),
  h2("Activity 4 · Who Qualifies?"),
  keyTable([3300, 4000, 3500], ["Likely eligible", "Not enough information: refer", "Likely not eligible"], [[
    "1 (doubled up after fire), 2 (motel, no alternative), 3 (unaccompanied youth), 5 (car and shelter), 8 (inadequate housing)",
    "6 (reason for the move matters), 7 (needs a private conversation with the liaison), 10 (potentially doubled up: more information is needed to know whether the move resulted from loss of housing, economic hardship, safety concerns, or another qualifying situation)",
    "4 (planned move, fixed and adequate housing), 9 (not eligible: although temporary, the housing is planned and adequate, not caused by loss of housing, economic hardship, or a similar reason)",
  ]]),
  h2("Activity 5 · Barrier Busters"),
  keyTable([500, 10300], ["#", "Right at stake → what should happen"], [
    ["1", "Immediate enrollment without records; the liaison helps get them afterward"],
    ["2", "School of origin with transportation; call the McKinney-Vento liaison right away"],
    ["3", "Full access to activities; fee waivers through the McKinney-Vento Program"],
    ["4", "Uniforms and clothing are available through the program; don't discipline for what the student can't control"],
    ["5", "Student is enrolled and attends while the dispute is resolved"],
    ["6", "Automatic eligibility for free meals; no form needed"],
  ]),
  para(t("Sources: 42 U.S.C. §§ 11431–11435 and § 1758(b)(12); MSDE Homeless Education Trend Data 2018–2024. Full list in SOURCES.md.", { pt: 8.5, color: "555555" }), { spacingExtra: { before: 240 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 } } }),
);

// 14. Answer key: cross-department
pages.push(
  ...header("Facilitator only · do not distribute", "Answer Key: Who Else Needs to Know?"),
  keyTable([700, 3300, 6800], ["Case", "Departments", "First step and key points"], [
    ["1", "McKinney-Vento liaison, special education / IEP team, transportation", "Enroll immediately and provide services comparable to the existing IEP right away; the liaison and IEP team coordinate records and transportation to the school of origin if that's in the student's best interest."],
    ["2", "McKinney-Vento liaison, ESOL office, registrar, nurse", "Enroll immediately without records; interpreter for the father; ESOL screening; the liaison helps obtain records and immunizations."],
    ["3", "McKinney-Vento liaison, counselor, college and career / financial aid", "The liaison can verify Destiny is an unaccompanied homeless youth, so she can apply for financial aid as an independent student without her parent's information."],
    ["4", "Child Protective Services (mandated report), McKinney-Vento liaison, nurse, food services, counselor / social worker", "The disclosure of harm requires a mandated report today. Living in a car is not, by itself, neglect; the report is about the abuse. Meet basic needs: meals, dental referral, and the liaison connects the family to shelter and services."],
    ["5", "McKinney-Vento liaison, early childhood / Pre-K, transportation, attendance", "School of origin with transportation if in each child's best interest; restore the pre-K placement (preschoolers are covered); attendance supports, not penalties."],
    ["6", "Counselor / social worker, school psychologist / behavioral health, McKinney-Vento liaison", "\"Doesn't see the point\" may signal suicide risk: follow the school's crisis protocol the same day, then ongoing support and removal of academic barriers."],
    ["7", "McKinney-Vento liaison, registrar / counselor, athletics", "Procedures must exist to award partial credit for work done at the previous school; work with athletics to remove barriers to staying on the team; transportation to school of origin if in his best interest."],
    ["8", "Registrar / front office, McKinney-Vento liaison, nurse, food services", "Enroll the same day without immunization records; liaison and nurse help get records; free meals start right away. Losing housing is not a reason for a report; keep the situation confidential."],
  ]),
  para(t("Close the activity by asking: \"Where do hand-offs between offices usually break down at our school?\"", { pt: 8.5, color: "555555" }), { spacingExtra: { before: 240 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 } } }),
);

const doc = new Document({
  creator: "City Schools McKinney-Vento Program",
  title: "McKinney-Vento PD Handouts",
  styles: { default: { document: { run: { font: FONT, size: pt(11.5) }, paragraph: { spacing: { line: 276, lineRule: "auto" } } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 720, bottom: 720, left: 720, right: 720, header: 360, footer: 360 } } }, children: pages }],
});
Packer.toBuffer(doc).then((b) => fs.writeFileSync(path.join(__dirname, "McKinney-Vento-PD-Handouts.docx"), b));
