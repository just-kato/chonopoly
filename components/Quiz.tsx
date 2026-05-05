"use client";
import { useState } from "react";
import { PracticeQuestion } from "@/types";

const PASS_THRESHOLD = 0.75;
const LETTERS = ["A", "B", "C", "D"];

type Result = { score: number; passed: boolean };

export default function Quiz({
  questions,
  onComplete,
  onNextChapter,
}: {
  questions: PracticeQuestion[];
  onComplete?: (passed: boolean, score: number, total: number) => void;
  onNextChapter?: () => void;
}) {
  const [selected, setSelected] = useState<(number | null)[]>(
    Array(questions.length).fill(null)
  );
  const [result, setResult] = useState<Result | null>(null);

  const answeredCount = selected.filter((a) => a !== null).length;
  const allAnswered = answeredCount === questions.length;
  const submitted = result !== null;

  function handleSelect(qi: number, oi: number) {
    if (submitted) return;
    setSelected((prev) => {
      const next = [...prev];
      next[qi] = next[qi] === oi ? null : oi;
      return next;
    });
  }

  function handleSubmit() {
    if (!allAnswered) return;
    const score = selected.filter((a, i) => a === questions[i].answerIndex).length;
    const passed = score / questions.length > PASS_THRESHOLD;
    setResult({ score, passed });
    onComplete?.(passed, score, questions.length);
  }

  function handleRetake() {
    setSelected(Array(questions.length).fill(null));
    setResult(null);
  }

  return (
    <div>
      {/* ── Results card (top, visible immediately after submit) ── */}
      {submitted && result && (
        <div
          className={`mb-8 bg-[#18181c] border rounded-xl p-6 ${
            result.passed ? "border-emerald-500/40" : "border-red-500/40"
          }`}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p
                className={`font-serif text-5xl font-bold leading-none ${
                  result.passed ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {result.score}/{questions.length}
              </p>
              <p
                className={`text-sm font-medium mt-2 ${
                  result.passed ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {result.passed ? "Passed ✓" : "Failed ✗"}
                {" · "}
                {Math.round((result.score / questions.length) * 100)}% correct
              </p>
              <p className="text-[#7a7870] text-xs mt-1">
                {result.passed
                  ? "Chapter complete. Retaking is optional."
                  : "You need above 75% to pass. Review the explanations and try again."}
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleRetake}
                className="bg-[#222228] border border-[#2e2e38] text-[#e8e6df] px-4 py-2 rounded-lg text-sm hover:border-amber-500/40 transition-colors"
              >
                ↺ {result.passed ? "Retake" : "Try Again"}
              </button>
              {result.passed && onNextChapter && (
                <button
                  onClick={onNextChapter}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-medium text-sm rounded-lg px-4 py-2 transition-colors"
                >
                  Next Chapter →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Question list ── */}
      {questions.map((q, qi) => {
        const chosen = selected[qi];
        const correct = submitted && chosen === q.answerIndex;
        const incorrect = submitted && chosen !== null && chosen !== q.answerIndex;

        return (
          <div
            key={qi}
            className={`bg-[#18181c] border rounded-xl p-5 mb-4 ${
              !submitted
                ? "border-[#2e2e38]"
                : correct
                ? "border-emerald-500/30"
                : "border-red-500/30"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="font-mono text-[11px] text-[#7a7870] tracking-widest">
                QUESTION {qi + 1} OF {questions.length}
              </p>
              {submitted && (
                <span
                  className={`font-mono text-[10px] tracking-widest ${
                    correct ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {correct ? "CORRECT" : "INCORRECT"}
                </span>
              )}
            </div>

            <p className="text-white font-medium text-[15px] leading-snug mb-4">
              {q.question}
            </p>

            <div className="flex flex-col gap-2 mb-3">
              {q.options.map((opt, oi) => {
                const isCorrectAnswer = oi === q.answerIndex;
                const isChosen = oi === chosen;

                let cls: string;
                if (!submitted) {
                  cls = isChosen
                    ? "bg-amber-500/15 border-amber-500 text-white"
                    : "bg-[#0f0f11] border-[#2e2e38] text-[#e8e6df] hover:border-amber-500/50";
                } else if (isCorrectAnswer) {
                  cls = "bg-emerald-500/10 border-emerald-500 text-white";
                } else if (isChosen) {
                  cls = "bg-red-500/10 border-red-500 text-[#c8c5bc]";
                } else {
                  cls = "bg-[#0f0f11] border-[#2e2e38] text-[#7a7870] opacity-50";
                }

                return (
                  <button
                    key={oi}
                    onClick={() => handleSelect(qi, oi)}
                    disabled={submitted}
                    className={`flex items-start gap-3 px-4 py-3 rounded-lg text-left text-sm border transition-colors ${cls} ${
                      !submitted ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <span
                      className={`font-mono text-xs shrink-0 mt-0.5 ${
                        submitted && isCorrectAnswer
                          ? "text-emerald-400"
                          : submitted && isChosen
                          ? "text-red-400"
                          : "text-[#7a7870]"
                      }`}
                    >
                      {LETTERS[oi]}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {submitted && isCorrectAnswer && (
                      <span className="text-emerald-400 text-[11px] font-mono shrink-0 mt-0.5">
                        ✓ correct
                      </span>
                    )}
                    {submitted && isChosen && !isCorrectAnswer && (
                      <span className="text-red-400 text-[11px] font-mono shrink-0 mt-0.5">
                        ✗ your answer
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div className="border-l-2 border-amber-500/50 pl-4 py-2 text-sm text-[#c8c5bc] leading-relaxed">
                <strong className="text-amber-400">Explanation: </strong>
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Submit button ── */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="w-full mt-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-medium text-sm rounded-xl px-4 py-3.5 transition-colors"
        >
          {allAnswered
            ? "Submit Answers"
            : `Answer all questions to submit (${answeredCount} / ${questions.length})`}
        </button>
      )}
    </div>
  );
}
