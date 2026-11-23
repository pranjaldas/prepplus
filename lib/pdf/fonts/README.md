# PDF fonts

Embedded in the scorecard PDF so non-Latin questions (e.g. Assamese/Bengali script) render correctly.

- `NotoSans-*.ttf`: Latin, Greek, Cyrillic and common symbols
- `NotoSansBengali-*.ttf`: Bengali script (Assamese, Bengali)

Source: https://github.com/notofonts (Google Noto fonts), licensed under the SIL Open Font License 1.1.
To support another script, add its Noto Sans font here, register it in `lib/pdf/ScorecardDocument.tsx`,
and append it to `FONT_STACK`.
