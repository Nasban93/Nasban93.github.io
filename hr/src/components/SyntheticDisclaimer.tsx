import { useLang } from "../i18n/useT";

export function SyntheticDisclaimer() {
  const { lang } = useLang();
  return (
    <p
      className="text-xs mt-3 pt-3 border-t italic"
      style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}
    >
      {lang === "ar"
        ? "جميع الأسماء مولّدة عشوائياً للتوضيح — أي تشابه مع أشخاص حقيقيين محض مصادفة."
        : "All names are randomly generated for demonstration; any resemblance to real individuals is coincidental."}
    </p>
  );
}
