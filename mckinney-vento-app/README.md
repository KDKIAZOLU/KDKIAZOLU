# McKinney-Vento Survey Manager

A fully offline, single-page web app for cleaning, correcting, and analyzing McKinney-Vento homeless-status family survey data (e.g. a Google Forms "Homeless Status Annual Review" export). Built with **plain HTML, CSS, and JavaScript only** — no Node.js, npm, build step, or server. It runs by opening `index.html` directly in Chrome or Edge, including via the `file://` protocol, with no internet connection required.

## Quick start

1. Open `index.html` in Chrome or Edge (double-click it, or drag it into a browser window).
2. On the **Import** tab, drop in a `.csv` or `.xlsx` export of the survey.
3. Review the **Column Mapping**, **School Corrections**, and **Data Quality** tabs (badges show how many items need a look).
4. Explore the **Dashboard** — filter by school, eligibility, living-situation category, support need, or uniform size.
5. Export filtered data as CSV or JSON from the Dashboard tab at any time.
6. Use **Settings** to swap in a different school reference list, manage saved mapping profiles/overrides, or back up your settings to a JSON file.

No data you import is ever sent anywhere — everything runs in your browser tab. Only reusable configuration (mapping profiles, school-name corrections, a custom school list, theme) is saved locally via `localStorage`; the actual family data lives only in memory for the session and disappears when the tab is closed or "Clear Current Dataset" is used.

## How the import engine works

Real-world exports of this survey are wide (200+ columns) because the source Google Form repeats an entire "student" block of questions once per enrolled child ("Do you have another student to add?"). Instead of hardcoding column positions, the app:

1. Scores every column header against a bilingual (English/Spanish) synonym dictionary (`js/schema.js`) to classify it as a specific household-level field (parent name, address, living situation, ...) or student-level field (student name, school, DOB, uniform needs, ...).
2. Detects every column that confidently matches "Student Name" as the start of a new repeating block, then assigns the remaining columns in between to the nearest preceding block (or to the household level if they classify more strongly there — handles mid-form questions like "how many children are enrolled" that appear again later).
3. Lets you review and manually override any column's classification, then save the corrected mapping as a named **profile** keyed to a signature of the header row — a similarly-shaped file next time is mapped automatically.

This means a different year's export, a partially reworded form, or reordered columns should still import correctly without any code changes.

## How school-name correction works

Family-entered school names are messy: misspellings, abbreviations ("ACCE", "Mervo"), and inconsistent formatting. `js/schools.js` + `js/fuzzy.js` resolve each entry against the official reference list (embedded from `SY2526_School_List.xlsx`, replaceable in Settings) using, in order:

1. Exact match (case/whitespace-insensitive)
2. A saved manual override (from a previous review decision)
3. A curated alias/acronym dictionary (`js/schools-data.js`)
4. Fuzzy string matching (token-level Levenshtein similarity, tuned against real survey data)

High-confidence results are applied automatically; anything uncertain is queued on the **School Corrections** tab for a human decision, which is then remembered for all future imports.

## How eligibility is determined

`js/eligibility.js` classifies each family's living situation against the McKinney-Vento Homeless Assistance Act's federal reporting subcategories (Doubled-Up, Hotels/Motels, Shelters, Transitional Housing, Unsheltered/Other) versus stable owned/leased housing, corroborated by follow-up answers (staying with others due to hardship, time-limited stay, safety/adequacy concerns, non-permanent arrangement). Contradictory combinations (e.g. "own our home" plus "staying with others due to loss of housing") are flagged for manual review rather than silently resolved.

## File structure

```
index.html            App shell, tabs, layout
css/styles.css         Design system (light/dark aware)
js/inflate.js          Pure-JS DEFLATE decompressor (RFC 1951)
js/zip.js               ZIP archive reader (built on inflate.js)
js/xlsx.js               .xlsx workbook reader (built on zip.js + DOMParser)
js/csv.js                 CSV parser/writer
js/fuzzy.js                 String similarity utilities
js/schema.js                  Column-mapping / synonym-matching engine
js/cleaning.js                  Field-level data cleaning
js/schools-data.js               Embedded official school list + alias dictionary
js/schools.js                     School-name correction engine
js/eligibility.js                    McKinney-Vento eligibility rules
js/datamodel.js                       Raw rows -> normalized family/student records
js/charts.js                           Canvas-based bar/donut chart rendering
js/store.js                             localStorage persistence
js/app.js                                 UI controller wiring everything together
```

No file in this app makes a network request or depends on anything outside this folder.
