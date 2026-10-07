interface NumberFieldProps {
  name: string;
  label: string;
  defaultValue: string;
  /** Id of the element that explains the error, if any. */
  errorId?: string;
  hideLabel?: boolean;
}

/** type="text" with a numeric keyboard: type="number" cannot be styled. */
export function NumberField({
  name,
  label,
  defaultValue,
  errorId,
  hideLabel,
}: NumberFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={name}
        className={hideLabel ? "sr-only" : "text-sm text-muted"}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={defaultValue}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        className="w-full min-w-0 border border-muted bg-background px-1 py-1 text-right tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      />
    </div>
  );
}
