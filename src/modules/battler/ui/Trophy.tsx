/** Our own trophy: a cup with two handles on a stand. Decoration only. */
export function Trophy({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      fillRule="evenodd"
      className={className}
    >
      <path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.35A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.35 12H8a4 4 0 0 1-4-4V5h3V3Zm-1 4v1a2 2 0 0 0 1 1.73V7H6Zm11 0v2.73A2 2 0 0 0 18 8V7h-1Z" />
    </svg>
  );
}
