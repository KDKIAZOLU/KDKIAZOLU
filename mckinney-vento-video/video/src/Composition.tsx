import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import durations from "./durations.json";
import narration from "../narration.json";

const FPS = 30;
const PAD_BEFORE = 12; // frames of silence before each scene's voiceover
const PAD_AFTER = 18; // frames of hold after the voiceover ends
const SOURCES_HOLD = 300; // extra frames so viewers can read the source list

const C = {
  bg: "#0B2545",
  bg2: "#13315C",
  accent: "#F2A900",
  text: "#FFFFFF",
  muted: "#B8C4D6",
  card: "rgba(255,255,255,0.07)",
  cardBorder: "rgba(255,255,255,0.14)",
};
const FONT = "Inter, 'Liberation Sans', sans-serif";

type SceneId = keyof typeof durations;

const sceneFrames = (id: SceneId) =>
  PAD_BEFORE +
  Math.ceil(durations[id] * FPS) +
  PAD_AFTER +
  (id === "sources" ? SOURCES_HOLD : 0);

const ORDER: SceneId[] = [
  "hook",
  "law",
  "history",
  "numbers",
  "who",
  "rights",
  "services",
  "role",
  "close",
  "sources",
];

const TOTAL = ORDER.reduce((sum, id) => sum + sceneFrames(id), 0);

// ---------- animation helpers ----------

const useEnter = (delay: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200 } });
};

const Enter: React.FC<{
  delay: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay, children, style }) => {
  const p = useEnter(delay);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * 40}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Delay (in frames) for something said at a given fraction of the narration.
const at = (id: SceneId, fraction: number) =>
  PAD_BEFORE + Math.round(durations[id] * FPS * fraction);

// ---------- shared layout ----------

const Kicker: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Enter delay={0}>
    <div
      style={{
        color: C.accent,
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: 4,
        textTransform: "uppercase",
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  </Enter>
);

const Headline: React.FC<{ children: React.ReactNode; size?: number }> = ({
  children,
  size = 84,
}) => (
  <Enter delay={4}>
    <div
      style={{
        color: C.text,
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1.1,
        letterSpacing: -1,
      }}
    >
      {children}
    </div>
  </Enter>
);

const SceneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      padding: "110px 140px 230px 140px",
      fontFamily: FONT,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);

const Card: React.FC<{
  delay: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay, children, style }) => (
  <Enter
    delay={delay}
    style={{
      background: C.card,
      border: `2px solid ${C.cardBorder}`,
      borderRadius: 24,
      padding: "28px 34px",
      ...style,
    }}
  >
    {children}
  </Enter>
);

// ---------- captions ----------

const splitCaptions = (text: string) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: string[] = [];
  for (const s of sentences) {
    // Split each sentence into evenly sized lines so no line is a lone word.
    const words = s.trim().split(" ");
    const n = Math.ceil(s.trim().length / 72);
    const target = s.trim().length / n;
    let line = "";
    for (const w of words) {
      if (line && (line + " " + w).length > target + 6) {
        chunks.push(line);
        line = w;
      } else {
        line = line ? line + " " + w : w;
      }
    }
    if (line) chunks.push(line);
  }
  return chunks;
};

// Spoken-number spellings are kept for the voice; captions show digits.
const CAPTION_FIXES: [RegExp, string][] = [
  [/twenty twenty-three to twenty-four/g, "2023–24"],
  [/nineteen eighty-seven/g, "1987"],
  [/two thousand one/g, "2001"],
  [/In two thousand,/g, "In 2000,"],
  [/twenty fifteen/g, "2015"],
  [/more than twenty thousand/g, "more than 20,000"],
  [/Fifty-seven hundred/g, "About 5,700"],
  [/one in four/g, "1 in 4"],
  [/one in thirteen/g, "1 in 13"],
  [/four four three, six four two, two four two four/g, "443-642-2424"],
];

const Captions: React.FC<{ id: SceneId }> = ({ id }) => {
  const frame = useCurrentFrame();
  let text = narration.find((n) => n.id === id)!.text;
  for (const [re, rep] of CAPTION_FIXES) text = text.replace(re, rep);
  const chunks = splitCaptions(text);
  const total = durations[id] * FPS;
  const totalChars = chunks.reduce((s, c) => s + c.length, 0);
  const t = frame - PAD_BEFORE;
  let acc = 0;
  let current = "";
  for (const c of chunks) {
    const len = (c.length / totalChars) * total;
    if (t >= acc && t < acc + len) current = c;
    acc += len;
  }
  if (!current) return null;
  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 56 }}
    >
      <div
        style={{
          fontFamily: FONT,
          background: "rgba(0,0,0,0.72)",
          color: "#fff",
          fontSize: 40,
          fontWeight: 500,
          padding: "14px 30px",
          borderRadius: 14,
          maxWidth: 1640,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {current}
      </div>
    </AbsoluteFill>
  );
};

// ---------- scenes ----------

const Hook: React.FC = () => (
  <SceneFrame>
    <Kicker>McKinney-Vento · City Schools PD</Kicker>
    <Headline size={96}>
      Some of your students won't sleep in the same place tonight{" "}
      <span style={{ color: C.accent }}>as they did last night.</span>
    </Headline>
    <Enter delay={at("hook", 0.55)}>
      <div style={{ color: C.muted, fontSize: 46, marginTop: 44 }}>
        Federal law protects their right to learn. We all have a part.
      </div>
    </Enter>
  </SceneFrame>
);

const Law: React.FC = () => (
  <SceneFrame>
    <Kicker>The law</Kicker>
    <Headline>McKinney-Vento Homeless Assistance Act</Headline>
    <Enter delay={8}>
      <div style={{ color: C.muted, fontSize: 40, marginTop: 14 }}>
        Subtitle VII-B · reauthorized by ESSA (Title IX, Part A)
      </div>
    </Enter>
    <div style={{ display: "flex", gap: 32, marginTop: 56 }}>
      {[
        ["Enrolled", at("law", 0.12)],
        ["Attending", at("law", 0.2)],
        ["Succeeding", at("law", 0.3)],
      ].map(([label, d]) => (
        <Card key={label as string} delay={d as number} style={{ flex: 1 }}>
          <div style={{ color: C.accent, fontSize: 56, fontWeight: 800 }}>
            {label}
          </div>
        </Card>
      ))}
    </div>
    <div style={{ display: "flex", gap: 32, marginTop: 32 }}>
      <Card delay={at("law", 0.55)} style={{ flex: 1 }}>
        <div style={{ color: C.muted, fontSize: 32 }}>Statewide oversight</div>
        <div style={{ color: C.text, fontSize: 44, fontWeight: 700 }}>
          Maryland State Department of Education
        </div>
      </Card>
      <Card delay={at("law", 0.75)} style={{ flex: 1 }}>
        <div style={{ color: C.muted, fontSize: 32 }}>Here in Baltimore</div>
        <div style={{ color: C.text, fontSize: 44, fontWeight: 700 }}>
          City Schools McKinney-Vento Program
        </div>
      </Card>
    </div>
  </SceneFrame>
);

const MILESTONES: [string, string, string, number][] = [
  [
    "1987",
    "Stewart B. McKinney Homeless Assistance Act",
    "Signed by President Reagan. Creates the Education for Homeless Children and Youth program.",
    0.03,
  ],
  [
    "2000",
    "Renamed McKinney\u2011Vento",
    "Honoring Minnesota Congressman Bruce Vento.",
    0.35,
  ],
  [
    "2001",
    "No Child Left Behind",
    "A liaison in every district, immediate enrollment, transportation to the school of origin.",
    0.49,
  ],
  [
    "2015",
    "Every Student Succeeds Act",
    "Stronger protections for preschoolers and unaccompanied youth, plus college and career readiness.",
    0.74,
  ],
];

const History: React.FC = () => {
  const frame = useCurrentFrame();
  const lineGrow = interpolate(
    frame,
    [at("history", 0.03), at("history", 0.8)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <SceneFrame>
      <Kicker>A brief history</Kicker>
      <Headline>Nearly 40 years of protecting students</Headline>
      <div style={{ position: "relative", marginTop: 70 }}>
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 0,
            height: 6,
            width: `${lineGrow * 100}%`,
            background: C.accent,
            borderRadius: 3,
          }}
        />
        <div style={{ display: "flex", gap: 28 }}>
          {MILESTONES.map(([year, title, desc, f]) => (
            <Enter key={year} delay={at("history", f)} style={{ flex: 1 }}>
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 33,
                  background: C.accent,
                  border: `8px solid ${C.bg}`,
                  marginBottom: 22,
                }}
              />
              <div style={{ color: C.accent, fontSize: 72, fontWeight: 800 }}>{year}</div>
              <div style={{ color: C.text, fontSize: 38, fontWeight: 700, lineHeight: 1.15 }}>
                {title}
              </div>
              <div style={{ color: C.muted, fontSize: 28, marginTop: 12, lineHeight: 1.35 }}>
                {desc}
              </div>
            </Enter>
          ))}
        </div>
      </div>
    </SceneFrame>
  );
};

const Counter: React.FC<{ to: number; delay: number; suffix?: string }> = ({
  to,
  delay,
  suffix = "",
}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [delay, delay + 40], [0, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <>
      {Math.round(v).toLocaleString("en-US")}
      {suffix}
    </>
  );
};

const TREND = [
  { year: "2018–19", value: 2922 },
  { year: "2022–23", value: 4733 },
  { year: "2023–24", value: 5732 },
];

const Numbers: React.FC = () => {
  const frame = useCurrentFrame();
  const barStart = at("numbers", 0.78);
  return (
    <SceneFrame>
      <Kicker>By the numbers · 2023–24</Kicker>
      <div style={{ display: "flex", gap: 60, marginTop: 10 }}>
        <div style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: 26 }}>
          <Card delay={at("numbers", 0.05)}>
            <div style={{ color: C.muted, fontSize: 32 }}>Maryland students identified</div>
            <div style={{ color: C.text, fontSize: 96, fontWeight: 800 }}>
              <Counter to={20402} delay={at("numbers", 0.08)} />
            </div>
          </Card>
          <Card delay={at("numbers", 0.3)} style={{ borderColor: C.accent }}>
            <div style={{ color: C.muted, fontSize: 32 }}>Baltimore City students identified</div>
            <div style={{ color: C.accent, fontSize: 112, fontWeight: 800 }}>
              <Counter to={5732} delay={at("numbers", 0.32)} />
            </div>
          </Card>
          <div style={{ display: "flex", gap: 26 }}>
            <Card delay={at("numbers", 0.45)} style={{ flex: 1 }}>
              <div style={{ color: C.text, fontSize: 64, fontWeight: 800 }}>1 in 4+</div>
              <div style={{ color: C.muted, fontSize: 30 }}>of Maryland's total</div>
            </Card>
            <Card delay={at("numbers", 0.62)} style={{ flex: 1 }}>
              <div style={{ color: C.text, fontSize: 64, fontWeight: 800 }}>~1 in 13</div>
              <div style={{ color: C.muted, fontSize: 30 }}>City Schools students</div>
            </Card>
          </div>
        </div>
        <Enter delay={barStart - 10} style={{ flex: 1 }}>
          <div style={{ color: C.text, fontSize: 44, fontWeight: 700, marginBottom: 6 }}>
            Baltimore City: nearly doubled
          </div>
          <div style={{ color: C.muted, fontSize: 30, marginBottom: 26 }}>
            Students identified, MSDE trend data
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 40, height: 400 }}>
            {TREND.map((t, i) => {
              const grow = interpolate(
                frame,
                [barStart + i * 8, barStart + i * 8 + 30],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                },
              );
              const h = (t.value / 5732) * 330 * grow;
              const last = i === TREND.length - 1;
              return (
                <div key={t.year} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      color: last ? C.accent : C.text,
                      fontSize: 38,
                      fontWeight: 800,
                      opacity: grow,
                      marginBottom: 10,
                    }}
                  >
                    {t.value.toLocaleString("en-US")}
                  </div>
                  <div
                    style={{
                      height: h,
                      background: last ? C.accent : "#5B7DB1",
                      borderRadius: "10px 10px 0 0",
                    }}
                  />
                  <div style={{ color: C.muted, fontSize: 30, marginTop: 12 }}>{t.year}</div>
                </div>
              );
            })}
          </div>
        </Enter>
      </div>
      <Enter delay={at("numbers", 0.1)}>
        <div style={{ color: C.muted, fontSize: 24, marginTop: 30 }}>
          Source: Maryland State Department of Education, Homeless Education Trend Data 2018–2024.
          City Schools share based on ~76,000 enrolled students.
        </div>
      </Enter>
    </SceneFrame>
  );
};

const WHO = [
  ["🏠", "Doubled-up", "Sharing housing due to loss of housing or economic hardship"],
  ["🏨", "Motels & hotels", "Or trailer parks and campgrounds, for lack of alternatives"],
  ["🛏️", "Shelters", "Emergency or transitional shelters"],
  ["🚗", "Unsheltered", "Cars, parks, abandoned buildings, stations, substandard housing"],
  ["🎒", "Unaccompanied youth", "Not in the physical custody of a parent or guardian"],
];

const Who: React.FC = () => (
  <SceneFrame>
    <Kicker>Who qualifies?</Kicker>
    <Headline size={72}>
      No <span style={{ color: C.accent }}>fixed, regular, and adequate</span> nighttime residence
    </Headline>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
        marginTop: 44,
      }}
    >
      {WHO.map(([icon, title, desc], i) => (
        <Card
          key={title}
          delay={at("who", [0.2, 0.55, 0.62, 0.68, 0.82][i])}
          style={{
            display: "flex",
            gap: 24,
            alignItems: "center",
            gridColumn: i === 0 ? "1 / span 2" : undefined,
            borderColor: i === 0 ? C.accent : C.cardBorder,
          }}
        >
          <div style={{ fontSize: 60 }}>{icon}</div>
          <div>
            <div style={{ color: C.text, fontSize: 42, fontWeight: 700 }}>
              {title}
              {i === 0 ? (
                <span style={{ color: C.accent, fontSize: 32, marginLeft: 18 }}>
                  most common
                </span>
              ) : null}
            </div>
            <div style={{ color: C.muted, fontSize: 30 }}>{desc}</div>
          </div>
        </Card>
      ))}
    </div>
  </SceneFrame>
);

const RIGHTS: [string, string, number][] = [
  ["Immediate enrollment", "Even without records, proof of address, or immunizations", 0.02],
  ["School of origin", "Stay when it's in the student's best interest", 0.33],
  ["Transportation", "Provided to the school of origin", 0.47],
  ["Free school meals", "Automatic eligibility", 0.58],
  ["Full access", "Title I, special education, activities, and more", 0.68],
  ["Enrolled during disputes", "While disagreements are resolved", 0.84],
];

const Rights: React.FC = () => (
  <SceneFrame>
    <Kicker>Student rights</Kicker>
    <Headline size={76}>Every student experiencing homelessness has the right to:</Headline>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 22,
        marginTop: 40,
      }}
    >
      {RIGHTS.map(([title, desc, f]) => (
        <Card
          key={title}
          delay={at("rights", f)}
          style={{ display: "flex", gap: 22, alignItems: "center" }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: C.accent,
              color: C.bg,
              fontSize: 42,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div>
            <div style={{ color: C.text, fontSize: 40, fontWeight: 700 }}>{title}</div>
            <div style={{ color: C.muted, fontSize: 28 }}>{desc}</div>
          </div>
        </Card>
      ))}
    </div>
  </SceneFrame>
);

const SERVICES: [string, string][] = [
  ["👕", "Uniforms & clothing"],
  ["✏️", "School supplies"],
  ["🚌", "Transportation"],
  ["🧺", "Laundry support"],
  ["🧾", "Fee waivers"],
  ["🤝", "Community resources"],
];

const Services: React.FC = () => (
  <SceneFrame>
    <Kicker>McKinney-Vento Program</Kicker>
    <Headline>How City Schools helps families</Headline>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 26,
        marginTop: 50,
      }}
    >
      {SERVICES.map(([icon, label], i) => (
        <Card
          key={label}
          delay={at("services", 0.3 + i * 0.1)}
          style={{ textAlign: "center", padding: "36px 20px" }}
        >
          <div style={{ fontSize: 76 }}>{icon}</div>
          <div style={{ color: C.text, fontSize: 40, fontWeight: 700, marginTop: 10 }}>
            {label}
          </div>
        </Card>
      ))}
    </div>
  </SceneFrame>
);

const STEPS: [string, string, number][] = [
  ["Notice", "Address changes, attendance gaps, fatigue, missing supplies, “staying with” someone", 0.2],
  ["Refer", "To your school-based McKinney-Vento liaison, who works with the McKinney-Vento Program", 0.38],
  ["Protect", "Housing status is a confidential education record (FERPA). Never discuss it in front of peers.", 0.58],
];

const Role: React.FC = () => (
  <SceneFrame>
    <Kicker>Your role</Kicker>
    <Headline size={96}>
      Notice <span style={{ color: C.accent }}>→</span> Refer{" "}
      <span style={{ color: C.accent }}>→</span> Protect
    </Headline>
    <div style={{ display: "flex", gap: 28, marginTop: 50 }}>
      {STEPS.map(([title, desc, f], i) => (
        <Card key={title} delay={at("role", f)} style={{ flex: 1 }}>
          <div style={{ color: C.accent, fontSize: 30, fontWeight: 800 }}>
            {String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ color: C.text, fontSize: 52, fontWeight: 800 }}>{title}</div>
          <div style={{ color: C.muted, fontSize: 30, marginTop: 8, lineHeight: 1.35 }}>
            {desc}
          </div>
        </Card>
      ))}
    </div>
    <Enter delay={at("role", 0.82)}>
      <div
        style={{
          marginTop: 36,
          fontSize: 40,
          fontWeight: 700,
          color: C.bg,
          background: C.accent,
          borderRadius: 16,
          padding: "18px 30px",
          display: "inline-block",
        }}
      >
        Never delay enrollment or services while waiting for documents.
      </div>
    </Enter>
  </SceneFrame>
);

const Close: React.FC = () => (
  <SceneFrame>
    <Headline size={104}>
      Stability starts <span style={{ color: C.accent }}>at school.</span>
    </Headline>
    <div style={{ display: "flex", gap: 30, marginTop: 56 }}>
      <Card delay={at("close", 0.3)} style={{ flex: 1 }}>
        <div style={{ color: C.muted, fontSize: 32 }}>First stop</div>
        <div style={{ color: C.text, fontSize: 46, fontWeight: 700 }}>
          Your school-based McKinney-Vento liaison
        </div>
      </Card>
      <Card delay={at("close", 0.55)} style={{ flex: 1, borderColor: C.accent }}>
        <div style={{ color: C.muted, fontSize: 32 }}>City Schools McKinney-Vento Liaison</div>
        <div style={{ color: C.accent, fontSize: 64, fontWeight: 800 }}>443-642-2424</div>
        <div style={{ color: C.text, fontSize: 30 }}>
          baltimorecityschools.org/page/homeless-services
        </div>
      </Card>
    </div>
  </SceneFrame>
);

const SOURCE_LIST: [string, string][] = [
  ["McKinney-Vento Act, 42 U.S.C. §§ 11431–11435", "uscode.house.gov/view.xhtml?path=/prelim@title42/chapter119/subchapter6/partB&edition=prelim"],
  ["National Center for Homeless Education", "nche.ed.gov/legislation/mckinney-vento/"],
  ["1987 McKinney Act, P.L. 100-77", "congress.gov/bill/100th-congress/house-bill/558"],
  ["2000 renaming, P.L. 106-400", "govinfo.gov/link/plaw/106/public/400"],
  ["President Clinton signing statement, Oct. 30, 2000", "clintonwhitehouse4.archives.gov/textonly/library/hot_releases/October_30_2000_4.html"],
  ["No Child Left Behind Act, P.L. 107-110", "congress.gov/bill/107th-congress/house-bill/1"],
  ["Every Student Succeeds Act, P.L. 114-95", "congress.gov/bill/114th-congress/senate-bill/1177"],
  ["MSDE Homeless Education Trend Data 2018–2024", "marylandpublicschools.org/about/Documents/DSFSS/Homeless/HomelessEducationTrendData2018-2024-A.pdf"],
  ["MSDE McKinney-Vento program", "marylandpublicschools.org/about/Pages/dsfss/homeless/index.aspx"],
  ["MSDE McKinney-Vento Fact Sheet (2023)", "marylandpublicschools.org/about/Documents/DSFSS/Homeless/McKinneyVentoFactsheet2023.pdf"],
  ["MSDE McKinney-Vento LEA coordinators", "marylandpublicschools.org/about/Documents/DSFSS/Homeless/McKinneyVentoLEACoordinators-A.pdf"],
  ["City Schools McKinney-Vento Program", "baltimorecityschools.org/page/homeless-services/"],
  ["City Schools Board Policy JFE", "go.boarddocs.com/mabe/bcpss/Board.nsf/goto?open=&id=96DRWG6F891E"],
  ["Free meals eligibility, 42 U.S.C. § 1758(b)(12)", "uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section1758&num=0&edition=prelim"],
  ["City Schools enrollment, NCES Common Core of Data", "nces.ed.gov/ccd/districtsearch/district_detail.asp?ID2=2400090"],
  ["Baltimore Sun / Capital News Service", "yahoo.com/news/maryland-homeless-students-increase-quarter-160100252.html"],
];

const Sources: React.FC = () => (
  <AbsoluteFill style={{ padding: "70px 110px 150px 110px", fontFamily: FONT }}>
    <Kicker>References</Kicker>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        columnGap: 56,
        rowGap: 18,
        marginTop: 6,
      }}
    >
      {SOURCE_LIST.map(([label, url], i) => (
        <Enter key={url} delay={6 + i * 2}>
          <div style={{ color: C.text, fontSize: 24, fontWeight: 700 }}>{label}</div>
          <div style={{ color: C.muted, fontSize: 18, wordBreak: "break-all", lineHeight: 1.3 }}>
            {url}
          </div>
        </Enter>
      ))}
    </div>
  </AbsoluteFill>
);

const SCENES: Record<SceneId, React.FC> = {
  hook: Hook,
  law: Law,
  history: History,
  numbers: Numbers,
  who: Who,
  rights: Rights,
  services: Services,
  role: Role,
  close: Close,
  sources: Sources,
};

// ---------- main ----------

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [0, TOTAL], [0, 30]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${70 - shift}% ${20 + shift / 2}%, ${C.bg2} 0%, ${C.bg} 60%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 16,
          height: "100%",
          background: C.accent,
        }}
      />
    </AbsoluteFill>
  );
};

const SceneWrapper: React.FC<{ id: SceneId; duration: number }> = ({ id, duration }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, duration - 10, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const Scene = SCENES[id];
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity }}>
        <Scene />
      </AbsoluteFill>
      <Sequence from={PAD_BEFORE}>
        <Audio src={staticFile(`audio/${id}.wav`)} />
      </Sequence>
      <Captions id={id} />
    </AbsoluteFill>
  );
};

export const McKinneyVento: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill>
      <Background />
      {ORDER.map((id) => {
        const d = sceneFrames(id);
        const el = (
          <Sequence key={id} from={from} durationInFrames={d} name={id}>
            <SceneWrapper id={id} duration={d} />
          </Sequence>
        );
        from += d;
        return el;
      })}
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="McKinneyVento"
      component={McKinneyVento}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
