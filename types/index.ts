export interface KeyTerm {
  term: string;
  definition: string;
  official?: boolean; // true = straight from course materials
  examTip?: string;
}

export interface Concept {
  title: string;
  icon: string;
  tag: string;
  tagColor: "gold" | "purple" | "green";
  body: string; // HTML string
}

export interface PracticeQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface QuickRefTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface RuleItem {
  text: string;
}

export interface ChapterData {
  id: string;               // e.g. "5-1"
  chapterNumber: string;    // e.g. "5.1"
  title: string;
  subtitle: string;
  objectives: string[];
  summary: string;
  concepts: Concept[];
  keyTerms: KeyTerm[];
  practiceQuestions: PracticeQuestion[];
  quickRefTables: QuickRefTable[];
  rules: RuleItem[];
  courseContent?: string;   // raw course text for reference
}
