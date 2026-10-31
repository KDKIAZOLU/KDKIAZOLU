// Builds BID-Toolkit.docx: letterhead, BID flowchart, decision table,
// BID meeting worksheet, resources aligned with City Schools policy, references.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, WidthType, BorderStyle,
  ShadingType, LevelFormat, PageNumber, HeadingLevel, ExternalHyperlink, PageBreak,
} = require("docx");

const NAVY = "0B2545";
const GOLD = "F2A900";
const SOFT = "EEF2F7";
const FONT = "Calibri";

const PORTRAIT = { width: 12240, height: 15840 };
const MARGIN = { top: 1300, bottom: 1000, left: 1080, right: 1080, header: 400, footer: 400 };
const W_PORTRAIT = PORTRAIT.width - MARGIN.left - MARGIN.right; // 10080
const W_LANDSCAPE = PORTRAIT.height - MARGIN.left - MARGIN.right; // 13680

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 20, ...o });
const p = (runs, o = {}) =>
  new Paragraph({ children: Array.isArray(runs) ? runs : [t(runs)], spacing: { after: 80 }, ...o });
const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 2 } },
    children: [t(text, { size: 32, bold: true, color: NAVY })],
  });
const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [t(text, { size: 24, bold: true, color: NAVY })],
  });
const bullet = (runs) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 40 },
    children: Array.isArray(runs) ? runs : [t(runs)],
  });
const link = (label, url) =>
  new ExternalHyperlink({ link: url, children: [t(label, { color: "1F4E9A", underline: {} })] });

const border = { style: BorderStyle.SINGLE, size: 4, color: "9AA5B4" };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (content, width, o = {}) =>
  new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    columnSpan: o.span,
    children: (Array.isArray(content) ? content : [content]).map((c) =>
      typeof c === "string" ? p([t(c, { bold: o.bold, color: o.color, size: o.size })], { spacing: { after: 0 } }) : c,
    ),
  });
const table = (widths, rows) =>
  new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r) => new TableRow({ children: r.map(([c, o], i) => cell(c, o?.width ?? widths[i], o)) })),
  });
const head = (cells, widths) => cells.map((c, i) => [c, { fill: SOFT, bold: true, color: NAVY, width: widths[i] }]);
const box = "☐ ";

// ---------- letterhead ----------
const letterhead = (width) =>
  new Header({
    children: [
      new Table({
        width: { size: width, type: WidthType.DXA },
        columnWidths: [2000, width - 2000],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 2000, type: WidthType.DXA },
                borders: { top: { style: BorderStyle.DASHED, size: 4, color: "9AA5B4" }, bottom: { style: BorderStyle.DASHED, size: 4, color: "9AA5B4" }, left: { style: BorderStyle.DASHED, size: 4, color: "9AA5B4" }, right: { style: BorderStyle.DASHED, size: 4, color: "9AA5B4" } },
                verticalAlign: "center",
                children: [p([t("[City Schools logo]", { size: 16, color: "777777", italics: true })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } })],
              }),
              new TableCell({
                width: { size: width - 2000, type: WidthType.DXA },
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                margins: { left: 200 },
                children: [
                  p([t("Baltimore City Public Schools", { size: 26, bold: true, color: NAVY })], { spacing: { after: 0 } }),
                  p([t("McKinney-Vento Program", { size: 20, bold: true, color: NAVY })], { spacing: { after: 0 } }),
                  p([t("200 East North Avenue · Baltimore, MD 21202 · McKinney-Vento Liaison: 443-642-2424 · baltimorecityschools.org", { size: 16, color: "444444" })], { spacing: { after: 0 } }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 1 } }, spacing: { after: 0 }, children: [] }),
    ],
  });
const footer = (label) =>
  new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          t(`${label} · Page `, { size: 16, color: "555555" }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "555555" }),
        ],
      }),
    ],
  });

// ---------- section 1: flowchart (landscape), built from table cells so every box is editable ----------
const GREEN = "1E7B4F", GREENBG = "E8F5EE", RED = "B03A2E", REDBG = "FBECEA", QBG = "FFF6DD";
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none };
const line12 = (color, style = BorderStyle.SINGLE) => ({ style, size: 12, color });
const fcol = [3500, 950, 4300, 950, 3980]; // sums to W_LANDSCAPE
const fs8 = 16; // 8 pt
const fp = (runs, o = {}) => new Paragraph({ spacing: { after: 20 }, children: runs, ...o });
const kinds = {
  start: { fill: NAVY, border: NAVY },
  q: { fill: QBG, border: GOLD },
  nobid: { fill: GREENBG, border: GREEN, title: GREEN },
  bid: { fill: REDBG, border: RED, title: RED },
  act: { fill: "FFFFFF", border: NAVY, title: NAVY },
  note: { fill: SOFT, border: NAVY, dashed: true },
};
const fbox = (kind, title, body, items = []) => {
  const k = kinds[kind];
  const b = line12(k.border, k.dashed ? BorderStyle.DASHED : BorderStyle.SINGLE);
  const children = [];
  if (kind === "start" || kind === "q")
    children.push(fp([t(title, { size: fs8 + 1, bold: true, color: kind === "start" ? "FFFFFF" : "111111" })], { alignment: AlignmentType.CENTER }));
  else {
    if (title) children.push(fp([t(title, { size: fs8 + 2, bold: true, color: k.title || "111111" })]));
    if (body) children.push(fp(Array.isArray(body) ? body : [t(body, { size: fs8 })]));
    for (const it of items)
      children.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 10 }, children: Array.isArray(it) ? it : [t(it, { size: fs8 })] }));
  }
  return { children, fill: k.fill, borders: { top: b, bottom: b, left: b, right: b } };
};
const arrow = (text, dir) => ({
  children: dir === "down"
    ? [fp([t("\u2193 ", { size: 24, bold: true, color: NAVY }), t(text, { size: fs8, bold: true, color: NAVY })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } })]
    : [fp([t(text, { size: fs8, bold: true, color: NAVY })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
       fp([t(dir === "left" ? "\u2190" : "\u2192", { size: 28, bold: true, color: NAVY })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } })],
});
const empty = { children: [fp([], { spacing: { after: 0 } })] };
const frow = (cells) =>
  new TableRow({
    cantSplit: true,
    children: cells.map((c, i) =>
      new TableCell({
        width: { size: fcol[i], type: WidthType.DXA },
        verticalAlign: "center",
        borders: c.borders || noBorders,
        shading: c.fill ? { fill: c.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: c.borders ? { top: 50, bottom: 50, left: 100, right: 100 } : { top: 0, bottom: 0, left: 40, right: 40 },
        children: c.children,
      }),
    ),
  });
const B = (s) => t(s, { size: fs8, bold: true });
const N = (s) => t(s, { size: fs8 });
const gap = (mid = empty, right = empty) => frow([empty, empty, mid, empty, right]);
const flowchart = [
  new Paragraph({ spacing: { after: 0 }, children: [t("Best Interest Determination (BID): When is one needed?", { size: 30, bold: true, color: NAVY })] }),
  new Paragraph({
    spacing: { after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 2 } },
    children: [t("McKinney-Vento school selection · City Schools McKinney-Vento Program · based on 42 U.S.C. § 11432(g)(3), COMAR 13A.05.09.04 and the MSDE BID FAQ", { size: 16, color: "444444" })],
  }),
  new Table({
    width: { size: W_LANDSCAPE, type: WidthType.DXA },
    columnWidths: fcol,
    rows: [
      frow([empty, empty, fbox("start", "Student identified as eligible for McKinney-Vento (liaison confirms)"), empty,
        fbox("note", null, [B("Every path: "), N("immediate enrollment, needs assessment, confidentiality, and documentation. Liaison line: 443-642-2424")])]),
      gap(arrow("", "down")),
      frow([
        fbox("nobid", "No BID needed: needs assessment & support", "The school of origin is also the local school, so there's no school choice to make. Keep the student enrolled; assess needs (meals, uniforms, supplies, fees, health, academics) and refer as needed."),
        arrow("NO", "left"),
        fbox("q", "Q1. Does the student's temporary residence put them outside the attendance zone of their school of origin?"),
        empty, empty]),
      gap(arrow("YES", "down")),
      frow([
        fbox("nobid", "No formal BID: honor the choice", [N("The presumption for the school of origin doesn't apply when it's contrary to the parent's or youth's request. Enroll in the local school "), B("immediately"), N(", even without records; explain the right to stay in the school of origin and document the informed choice; needs assessment & supports.")]),
        arrow("Local school", "left"),
        fbox("q", "Q2. Which school does the parent / guardian or unaccompanied youth want?"),
        empty, empty]),
      gap(arrow("School of origin, or unsure", "down")),
      frow([empty, empty,
        fbox("q", "Q3. Is the parent or youth unsure, or does the school system have concerns that the school of origin is not in the student's best interest?"),
        arrow("NO", "right"),
        fbox("nobid", "No formal BID: presumption stands", "Keep the student in the school of origin; arrange transportation; document the decision; needs assessment & supports.")]),
      gap(arrow("YES", "down")),
      frow([
        fbox("act", "Revisit when…", null, [
          "The family moves again",
          "The student moves up a school level (the feeder school counts as school of origin)",
          "The student becomes permanently housed: they may stay in the school of origin for the rest of that school year, no new BID needed"]),
        empty,
        fbox("bid", "Formal BID meeting (liaison leads)", "Presume the school of origin is in the student's best interest and give priority to the parent's or youth's request. Consider student-centered factors:", [
          "Impact of moving on achievement, education, health and safety",
          "Time left in the school year; age and grade; IEP / 504 / EL services",
          "Attendance, relationships, the student's wishes; travel time (not cost)"]),
        arrow("Decide", "right"),
        fbox("act", "Decision", null, [
          [B("Agree: "), N("enroll in the chosen school; transportation to the school of origin if chosen; supports continue")],
          [B("School system decides against the parent's or youth's request: "), N("written explanation and notice of the right to appeal. The student stays in the requested school, with transportation, while the dispute is resolved.")]])]),
    ],
  }),
  new Paragraph({
    spacing: { before: 80, after: 0 },
    children: [t("Key: ", { size: 15, bold: true }), t("Yellow = question   ", { size: 15 }), t("Green = no formal BID (needs assessment & support)   ", { size: 15, color: GREEN }), t("Red = formal BID", { size: 15, color: RED })],
  }),
];

// ---------- section 2: decision table, worksheet, resources, references (portrait) ----------
const W = W_PORTRAIT;
const dt = [1500, 3700, 4880];
const decisionTable = [
  h1("BID Decision Guide (editable text version of the flowchart)"),
  p("Use this table alongside the flowchart. Every path includes immediate enrollment, a needs assessment, confidentiality, and documentation."),
  table(dt, [
    head(["Step", "Question", "What to do"], dt),
    [["Q1"], ["Does the student's temporary residence put them outside the attendance zone of their school of origin?"], [[p([t("No: ", { bold: true }), t("No BID needed. Keep the student enrolled; complete a needs assessment (meals, uniforms, supplies, fees, health, academics) and refer as needed.")], { spacing: { after: 40 } }), p([t("Yes: ", { bold: true }), t("go to Q2.")], { spacing: { after: 0 } })]]],
    [["Q2"], ["Which school does the parent / guardian or unaccompanied youth want?"], [[p([t("Local school: ", { bold: true }), t("No formal BID. Enroll immediately, even without records. Explain the right to stay in the school of origin and document the informed choice.")], { spacing: { after: 40 } }), p([t("School of origin, or unsure: ", { bold: true }), t("go to Q3.")], { spacing: { after: 0 } })]]],
    [["Q3"], ["Is the parent or youth unsure, or does the school system have concerns that the school of origin is not in the student's best interest?"], [[p([t("No: ", { bold: true }), t("No formal BID; the presumption stands. Keep the student in the school of origin, arrange transportation, document the decision.")], { spacing: { after: 40 } }), p([t("Yes: ", { bold: true }), t("hold a formal BID meeting using the worksheet.")], { spacing: { after: 0 } })]]],
    [["Decision"], ["Did the meeting reach agreement?"], [[p([t("Agree: ", { bold: true }), t("enroll in the chosen school; transportation to the school of origin if chosen.")], { spacing: { after: 40 } }), p([t("School system decides against the parent's or youth's request: ", { bold: true }), t("give a written explanation and notice of the right to appeal. The student stays in the requested school, with transportation, while the dispute is resolved.")], { spacing: { after: 0 } })]]],
    [["Revisit"], ["When should the decision be reviewed?"], ["When the family moves again; when the student moves up a school level (the feeder school counts as school of origin). A student who becomes permanently housed may stay in the school of origin for the rest of that school year without a new BID."]],
  ]),
];

const line = (label, w = W) => [[[p([t(label, { bold: true, size: 18 })], { spacing: { after: 0 } }), p(" ", { spacing: { after: 60 } })], { width: w }]];
const half = W / 2;
const fw = [4080, 2000, 2000, 2000];
const factors = [
  "Academic progress and grades",
  "Time left in the school year / grading period",
  "IEP, 504 plan, English learner services",
  "Attendance at each school",
  "Health and safety (including the route)",
  "Relationships: teachers, peers, siblings",
  "Extracurriculars, athletics, programs",
  "Travel time and its effect (not cost)",
  "Expected length of the housing situation",
  "The student's own wishes (age-appropriate)",
];
const worksheet = [
  new Paragraph({ children: [new PageBreak()] }),
  h1("Best Interest Determination (BID) Meeting Worksheet"),
  p([t("Confidential student record when completed. ", { bold: true }), t("Housing information is shared only with staff who need it to serve the student.")]),
  h2("1. Student and meeting information"),
  table([half, half], [
    [...line("Student name", half), ...line("Student ID / Grade / DOB", half)],
    [...line("School of origin", half), ...line("Local attendance-area school", half)],
    [...line("Date identified as McKinney-Vento eligible", half), ...line("Meeting date", half)],
    [...line("McKinney-Vento liaison", half), ...line("Parent / guardian or unaccompanied youth", half)],
    [[[p([t("Other participants (name / role)", { bold: true, size: 18 })], { spacing: { after: 0 } }), p(" ", { spacing: { after: 240 } })], { width: W, span: 2 }]],
  ]),
  h2("2. Current living situation (check one)"),
  p([t(`${box}Doubled up (sharing housing due to loss of housing or economic hardship)    ${box}Shelter    ${box}Motel / hotel`)]),
  p([t(`${box}Car, park, or other place not meant for housing    ${box}Unaccompanied youth    ${box}Other: ____________________`)]),
  h2("3. Parent / guardian or unaccompanied youth preference"),
  p([t(`${box}School of origin    ${box}Local attendance-area school    ${box}Unsure`)]),
  p("Reason(s) given: ______________________________________________________________________________"),
  p("Student's own views (if age-appropriate): ________________________________________________________"),
  h2("4. Student-centered factors"),
  p([t("Presume the school of origin is in the student's best interest and give priority to the parent's or youth's request. Note how each factor applies to each school.", { italics: true, size: 18 })]),
  table(fw, [
    head(["Factor", "School of origin", "Local school", "Notes"], fw),
    ...factors.map((f) => [[f, { size: 18 }], [""], [""], [""]]),
  ]),
  new Paragraph({ children: [new PageBreak()] }),
  h2("5. Decision"),
  p([t(`${box}School of origin, for the duration of homelessness (or the rest of the school year if permanently housed)`)]),
  p([t(`${box}Local attendance-area school`)]),
  p([t(`${box}Decision agrees with the parent's / youth's request    ${box}Decision is contrary to the request (complete section 7)`)]),
  h2("6. Transportation and support plan"),
  table([W], [
    line("Transportation to the school of origin (mode, pick-up / drop-off, start date)"),
    line("Needs assessment and supports (meals, uniforms, supplies, fees, health, academics, referrals)"),
    line("Records / services to transfer (IEP, 504, EL, immunizations, credits)"),
  ]),
  h2("7. Written explanation and right to appeal (if the decision is contrary to the request)"),
  p("Reasons for the decision, in plain language: ____________________________________________________________"),
  p("______________________________________________________________________________________________"),
  p([t(`${box}Written explanation given to parent / youth on (date): __________    ${box}Notice of the right to appeal given`)]),
  p([t("The student remains enrolled in the school requested by the parent or youth, with transportation, while the dispute is resolved. ", { bold: true }), t("The liaison helps the parent or youth file the appeal and follows City Schools' and MSDE's dispute resolution process.")]),
  h2("8. Signatures"),
  table([half, half], [
    [...line("Parent / guardian or unaccompanied youth", half), ...line("Date", half)],
    [...line("McKinney-Vento liaison", half), ...line("Date", half)],
    [...line("School administrator (optional)", half), ...line("Date", half)],
  ]),
  p([t("Parent / youth comments: ", { bold: true }), t(`${box}I agree    ${box}I disagree and want to appeal`)], { spacing: { before: 120 } }),
];

const rw = [3300, 4180, 2600];
const res = (name, url, what, label) => [[[p([link(name, url)], { spacing: { after: 0 } })]], [what], [label]];
const resources = [
  new Paragraph({ children: [new PageBreak()] }),
  h1("McKinney-Vento Resources"),
  p("Resources that support City Schools Board Policy JFE (Students Experiencing Homelessness) and the McKinney-Vento Program. Verify phone numbers and links before sharing with families."),
  h2("City Schools"),
  table(rw, [
    head(["Resource", "What it's for", "Contact"], rw),
    res("City Schools McKinney-Vento Program", "https://www.baltimorecityschools.org/page/homeless-services/", "Eligibility, enrollment, school-of-origin transportation, uniforms, supplies, fee waivers, referrals", "443-642-2424"),
    res("Board Policy JFE: Students Experiencing Homelessness", "https://go.boarddocs.com/mabe/bcpss/Board.nsf/goto?open=&id=96DRWG6F891E", "City Schools' policy on identification, enrollment, school selection and disputes", "BoardDocs"),
    [["School-based McKinney-Vento liaison"], ["First contact for staff referrals and BID meetings at each school"], ["Name / ext.: ________"]],
  ]),
  h2("Maryland"),
  table(rw, [
    head(["Resource", "What it's for", "Contact"], rw),
    res("MSDE McKinney-Vento program", "https://www.marylandpublicschools.org/about/Pages/dsfss/homeless/index.aspx", "State coordinator, guidance, dispute resolution information", "MSDE website"),
    res("MSDE Best Interest Determinations FAQ", "https://marylandpublicschools.org/about/Documents/DSFSS/Homeless/Best-Interest-Determination-FAQ-A.pdf", "Maryland guidance on when and how to hold a BID", "PDF"),
    res("MSDE McKinney-Vento Fact Sheet", "https://marylandpublicschools.org/about/Documents/DSFSS/Homeless/McKinney-Vento-Factsheet-A.pdf", "Plain-language summary of student rights for families and staff", "PDF"),
    res("COMAR 13A.05.09: Programs for Homeless Children", "https://dsd.maryland.gov/regulations/Pages/13A.05.09.04.aspx", "Maryland regulation on placement and school selection", "Maryland DSD"),
    res("Maryland 211", "https://211md.org", "Shelter, food, utility and housing help statewide", "Dial 2-1-1"),
  ]),
  h2("Baltimore City community partners"),
  table(rw, [
    head(["Resource", "What it's for", "Contact"], rw),
    res("Mayor's Office of Homeless Services", "https://www.baltimorecity.gov/homeless", "City shelter system, outreach and housing programs", "Website"),
    res("Health Care for the Homeless", "https://www.hchmd.org", "Medical, dental, behavioral health and pediatric care for people experiencing homelessness", "Website"),
  ]),
  h2("National"),
  table(rw, [
    head(["Resource", "What it's for", "Contact"], rw),
    res("National Center for Homeless Education (NCHE)", "https://nche.ed.gov/school-selection/", "School selection and best interest briefs, liaison toolkit", "Helpline listed on site"),
    res("SchoolHouse Connection", "https://schoolhouseconnection.org/interview-checklists-for-supporting-school-selection/", "School selection interview checklists, Q&A from the field, FAFSA help for unaccompanied youth", "Website"),
    res("Federal Student Aid: unaccompanied homeless youth", "https://studentaid.gov", "Applying for financial aid as an independent student with a liaison's determination", "studentaid.gov"),
  ]),
];

const refs = [
  new Paragraph({ children: [new PageBreak()] }),
  h1("References"),
  ...[
    ["42 U.S.C. § 11432(g)(3): school selection, presumption, student-centered factors, written explanation, enrollment during disputes, school of origin definition", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section11432&num=0&edition=prelim"],
    ["42 U.S.C. § 11432(g)(1)(J)(iii): transportation to the school of origin", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section11432&num=0&edition=prelim"],
    ["COMAR 13A.05.09.04: Maryland placement of homeless students", "https://dsd.maryland.gov/regulations/Pages/13A.05.09.04.aspx"],
    ["MSDE, McKinney-Vento Best Interest Determinations FAQ", "https://marylandpublicschools.org/about/Documents/DSFSS/Homeless/Best-Interest-Determination-FAQ-A.pdf"],
    ["MSDE, McKinney-Vento Fact Sheet", "https://marylandpublicschools.org/about/Documents/DSFSS/Homeless/McKinney-Vento-Factsheet-A.pdf"],
    ["City Schools Board Policy JFE, Students Experiencing Homelessness", "https://go.boarddocs.com/mabe/bcpss/Board.nsf/goto?open=&id=96DRWG6F891E"],
    ["NCHE, School Selection & Best Interest", "https://nche.ed.gov/school-selection/"],
    ["NCHE, Understanding and Implementing School Selection and Best Interest Under the McKinney-Vento Act", "https://nche.ed.gov/school-selection-and-best-interest-determination-brief/"],
    ["SchoolHouse Connection, Interview Checklists for Supporting School Selection", "https://schoolhouseconnection.org/interview-checklists-for-supporting-school-selection/"],
    ["NC Homeless Education Program, Considerations for Determining Best Interest", "https://hepnc.uncg.edu/wp-content/uploads/2025/08/Considerations-for-Determining-Best-Interest.pdf"],
  ].map(([label, url]) => new Paragraph({ numbering: { reference: "refs", level: 0 }, spacing: { after: 60 }, children: [t(label + ": "), link(url, url)] })),
];

const doc = new Document({
  creator: "City Schools McKinney-Vento Program",
  title: "Best Interest Determination Toolkit",
  styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] },
      { reference: "refs", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 400 } } } }] },
    ],
  },
  sections: [
    {
      properties: { page: { size: { ...PORTRAIT, orientation: PageOrientation.LANDSCAPE }, margin: { ...MARGIN, top: 1250 } } },
      headers: { default: letterhead(W_LANDSCAPE) },
      footers: { default: footer("McKinney-Vento Best Interest Determination Toolkit") },
      children: flowchart,
    },
    {
      properties: { page: { size: PORTRAIT, margin: MARGIN } },
      headers: { default: letterhead(W_PORTRAIT) },
      footers: { default: footer("McKinney-Vento Best Interest Determination Toolkit") },
      children: [...decisionTable, ...worksheet, ...resources, ...refs],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => fs.writeFileSync(path.join(__dirname, "BID-Toolkit.docx"), buf));
