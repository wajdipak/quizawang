export function readInitialExamParams(context?: unknown): {
  isStudentLinkMode: boolean;
  quizCode: string | null;
  autostart: boolean;
} {
  if (typeof window === 'undefined' || !context) {
    return { isStudentLinkMode: false, quizCode: null, autostart: false };
  }

  const params = new URLSearchParams(window.location.search);
  const examParam = params.get('exam');
  const urlCode = examParam || params.get('code');
  const autostart = params.get('autostart') === '1';

  if (urlCode) {
    return { isStudentLinkMode: true, quizCode: urlCode.toUpperCase(), autostart: false };
  }

  if (autostart) {
    return { isStudentLinkMode: false, quizCode: null, autostart: true };
  }

  return { isStudentLinkMode: false, quizCode: null, autostart: false };
}
