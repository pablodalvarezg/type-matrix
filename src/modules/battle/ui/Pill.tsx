interface PillProps {
  type: "radio" | "checkbox";
  name: string;
  label: string;
  value?: string;
  defaultChecked?: boolean;
}

/**
 * A native radio or checkbox drawn as a pill: it submits with the form and
 * keeps its keyboard behaviour. Checked fills the pill and underlines the
 * label, so the state reads without colour.
 */
export function Pill({ type, name, label, value, defaultChecked }: PillProps) {
  return (
    <label className="inline-flex cursor-pointer">
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="border border-muted px-2 py-1 text-sm peer-checked:bg-foreground peer-checked:text-background peer-checked:underline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground">
        {label}
      </span>
    </label>
  );
}
