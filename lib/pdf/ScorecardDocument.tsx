import path from 'path';
import { Document, Font, Page, Path, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import { OPTION_KEYS, type AnswersMap, type FullQuestion } from '../types';

// Built-in PDF fonts (Helvetica) only cover Latin text, so Assamese/Bengali questions
// came out as garbage. Embed Noto fonts instead; each character uses the first font
// in FONT_STACK that has it. See lib/pdf/fonts/README.md to add more scripts.
const FONT_DIR = path.join(process.cwd(), 'lib', 'pdf', 'fonts');

Font.register({
  family: 'NotoSans',
  fonts: [
    { src: path.join(FONT_DIR, 'NotoSans-Regular.ttf') },
    { src: path.join(FONT_DIR, 'NotoSans-Bold.ttf'), fontWeight: 'bold' },
  ],
});
Font.register({
  family: 'NotoSansBengali',
  fonts: [
    { src: path.join(FONT_DIR, 'NotoSansBengali-Regular.ttf') },
    { src: path.join(FONT_DIR, 'NotoSansBengali-Bold.ttf'), fontWeight: 'bold' },
  ],
});
// Never split words: hyphenating Indic text breaks letter clusters apart.
Font.registerHyphenationCallback((word) => [word]);

const FONT_STACK = ['NotoSans', 'NotoSansBengali'];

const C = {
  ink: '#1E1B4B',
  blue: '#3B82F6',
  green: '#10B981',
  greenBg: '#D1FAE5',
  red: '#EF4444',
  redBg: '#FEE2E2',
  slate: '#64748B',
  border: '#E2E8F0',
  muted: '#F8FAFC',
};

const s = StyleSheet.create({
  page: { padding: 36, paddingBottom: 54, fontSize: 10, fontFamily: FONT_STACK, color: '#1E293B' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.ink,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  tagline: { color: '#C7D2FE', fontSize: 8, marginLeft: 8, marginTop: 2 },
  headerRight: { color: '#C7D2FE', fontSize: 8, textAlign: 'right' },
  title: { fontSize: 15, fontWeight: 'bold', color: C.ink, marginBottom: 8 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  infoCell: { width: '50%', marginBottom: 4 },
  infoLabel: { color: C.slate, fontSize: 8 },
  infoValue: { fontSize: 10, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', marginBottom: 18 },
  stat: { flex: 1, borderRadius: 6, padding: 10, marginRight: 6, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 8, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: C.ink, marginBottom: 8 },
  q: { borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 10, marginBottom: 10 },
  qHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  qNum: { fontWeight: 'bold', color: C.ink },
  pill: { fontSize: 8, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, fontWeight: 'bold' },
  qText: { fontSize: 10.5, marginBottom: 6, lineHeight: 1.4 },
  opt: { flexDirection: 'row', padding: 5, borderRadius: 4, marginBottom: 3, borderWidth: 1, borderColor: C.border },
  optLetter: { width: 16, fontWeight: 'bold' },
  optText: { flex: 1 },
  optTag: { fontSize: 7.5, fontWeight: 'bold', marginLeft: 6 },
  answerLine: { flexDirection: 'row', marginTop: 4, fontSize: 9 },
  note: { marginTop: 6, padding: 7, backgroundColor: '#EEF2FF', borderRadius: 4, fontSize: 9, lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: C.slate,
  },
});

const LETTERS = ['A', 'B', 'C', 'D'];

export interface ScorecardProps {
  candidate: { name: string; email: string; phone: string | null };
  exam: {
    title: string;
    code: string;
    durationMinutes: number;
    marksPerQuestion: number;
    isNegativeMarking: boolean;
    negativeMark: number;
  };
  attempt: {
    startedAt: string;
    submittedAt: string | null;
    total: number;
    right: number;
    wrong: number;
    unanswered: number;
    score: number;
  };
  questions: FullQuestion[];
  answers: AnswersMap;
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function fmtDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
}

function PdfLogo() {
  return (
    <Svg width={26} height={26} viewBox="0 0 48 48">
      <Rect x={2} y={2} width={44} height={44} rx={12} fill="#312E81" />
      <Path
        d="M7 26 L14 26 L17.5 18 L22 33 L26 24 L30 30 L41 14"
        stroke={C.green}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function ScorecardDocument({ candidate, exam, attempt, questions, answers }: ScorecardProps) {
  const maxScore = attempt.total * exam.marksPerQuestion;
  const marking = exam.isNegativeMarking && exam.negativeMark > 0
    ? `+${fmt(exam.marksPerQuestion)} / -${fmt(exam.negativeMark)}`
    : `+${fmt(exam.marksPerQuestion)} / no negative`;

  return (
    <Document title={`${exam.title} - ${candidate.name} - PrepPulse Scorecard`} author="PrepPulse">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View style={s.brand}>
            <PdfLogo />
            <View>
              <Text style={s.brandName}>PrepPulse</Text>
              <Text style={s.tagline}>Precision Mock Exams &amp; Instant Insights</Text>
            </View>
          </View>
          <Text style={s.headerRight}>Exam Review Report{'\n'}{exam.code}</Text>
        </View>

        <Text style={s.title}>{exam.title}</Text>
        <View style={s.infoGrid}>
          <Info label="Candidate" value={candidate.name} />
          <Info label="Email" value={candidate.email} />
          <Info label="Phone" value={candidate.phone ?? '-'} />
          <Info label="Exam code" value={exam.code} />
          <Info label="Started" value={fmtDate(attempt.startedAt)} />
          <Info label="Submitted" value={fmtDate(attempt.submittedAt)} />
          <Info label="Duration" value={`${exam.durationMinutes} minutes`} />
          <Info label="Marking" value={marking} />
        </View>

        <View style={s.statsRow}>
          <Stat label="Final score" value={`${fmt(attempt.score)} / ${fmt(maxScore)}`} color={C.ink} bg="#EEF2FF" />
          <Stat label="Correct" value={String(attempt.right)} color={C.green} bg={C.greenBg} />
          <Stat label="Wrong" value={String(attempt.wrong)} color={C.red} bg={C.redBg} />
          <Stat label="Unanswered" value={String(attempt.unanswered)} color={C.slate} bg={C.muted} />
        </View>

        <Text style={s.sectionTitle}>Question-by-question review</Text>

        {questions.map((q) => {
          const selected = answers[String(q.index)];
          const isCorrect = !!selected && selected === q.correct_key;
          const status = !selected ? 'UNANSWERED' : isCorrect ? 'CORRECT' : 'WRONG';
          const pillStyle = !selected
            ? { backgroundColor: C.muted, color: C.slate }
            : isCorrect
              ? { backgroundColor: C.greenBg, color: '#047857' }
              : { backgroundColor: C.redBg, color: '#B91C1C' };
          const selectedIdx = selected ? OPTION_KEYS.indexOf(selected) : -1;
          const correctIdx = q.correct_key ? OPTION_KEYS.indexOf(q.correct_key) : -1;

          return (
            <View key={q.index} style={s.q} wrap={false}>
              <View style={s.qHead}>
                <Text style={s.qNum}>Question {q.index}</Text>
                <Text style={[s.pill, pillStyle]}>{status}</Text>
              </View>
              <Text style={s.qText}>{q.question}</Text>

              {q.options.map((opt, i) => {
                const isSel = i === selectedIdx;
                const isAns = i === correctIdx;
                const optStyle = isSel
                  ? isCorrect
                    ? { backgroundColor: C.greenBg, borderColor: C.green }
                    : { backgroundColor: C.redBg, borderColor: C.red }
                  : isAns
                    ? { borderColor: C.green }
                    : {};
                return (
                  <View key={i} style={[s.opt, optStyle]}>
                    <Text style={s.optLetter}>{LETTERS[i]}.</Text>
                    <Text style={s.optText}>{opt}</Text>
                    {isSel && (
                      <Text style={[s.optTag, { color: isCorrect ? '#047857' : '#B91C1C' }]}>YOUR ANSWER</Text>
                    )}
                    {isAns && !isSel && <Text style={[s.optTag, { color: '#047857' }]}>CORRECT</Text>}
                  </View>
                );
              })}

              <View style={s.answerLine}>
                <Text style={{ color: C.slate }}>Your answer: </Text>
                <Text style={{ fontWeight: 'bold', color: !selected ? C.slate : isCorrect ? C.green : C.red }}>
                  {selectedIdx >= 0 ? `${LETTERS[selectedIdx]}. ${q.options[selectedIdx]}` : 'Not answered'}
                </Text>
              </View>
              <View style={s.answerLine}>
                <Text style={{ color: C.slate }}>Correct answer: </Text>
                <Text style={{ fontWeight: 'bold', color: C.green }}>
                  {correctIdx >= 0 ? `${LETTERS[correctIdx]}. ${q.options[correctIdx]}` : q.correct_option || '-'}
                </Text>
              </View>
              {q.note ? (
                <Text style={s.note}>
                  <Text style={{ fontWeight: 'bold' }}>Explanation: </Text>
                  {q.note}
                </Text>
              ) : null}
            </View>
          );
        })}

        <View style={s.footer} fixed>
          <Text>
            PrepPulse · {candidate.name} · {exam.code}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoCell}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function Stat({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[s.stat, { backgroundColor: bg }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
    </View>
  );
}
