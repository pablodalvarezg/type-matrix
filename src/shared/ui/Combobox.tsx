"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";

/*
 * A text input with a list of suggestions (WAI-ARIA combobox, list
 * autocomplete). It is a plain named input inside its form, so without
 * JavaScript it still submits whatever was typed. Picking a suggestion
 * submits the form: in the calculator that refreshes the move list and the
 * result without a separate click.
 */

const MAX_SHOWN = 30;

// "flabebe" finds "Flabébé".
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

// Nothing until a letter is typed. Exact match first, so "Mew" lists Mew
// before Mewtwo.
function suggest(
  options: string[],
  query: string,
): { shown: string[]; hidden: number } {
  const q = fold(query.trim());
  if (!q) return { shown: [], hidden: 0 };
  const exact: string[] = [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const option of options) {
    const folded = fold(option);
    if (folded === q) exact.push(option);
    else if (folded.startsWith(q)) starts.push(option);
    else if (folded.includes(q)) contains.push(option);
  }
  const all = [...exact, ...starts, ...contains];
  return {
    shown: all.slice(0, MAX_SHOWN),
    hidden: Math.max(all.length - MAX_SHOWN, 0),
  };
}

interface ComboboxProps {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
  error?: string;
  placeholder?: string;
}

export function Combobox({
  name,
  label,
  options,
  defaultValue = "",
  error,
  placeholder,
}: ComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  // -1 until the person moves through the list: Enter then submits what
  // they typed instead of silently swapping it for the first suggestion.
  const [active, setActive] = useState(-1);

  const { shown: matches, hidden } = open
    ? suggest(options, value)
    : { shown: [], hidden: 0 };
  const expanded = matches.length > 0;
  const optionId = (index: number) => `${id}-option-${index}`;

  useEffect(() => {
    if (expanded) {
      document
        .getElementById(optionId(active))
        ?.scrollIntoView({ block: "nearest" });
    }
  });

  const choose = (option: string) => {
    // The DOM value must be the chosen one before the form reads it.
    flushSync(() => {
      setValue(option);
      setOpen(false);
    });
    input.current?.form?.requestSubmit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else
        setActive((index) =>
          Math.min(index + 1, Math.max(matches.length - 1, 0)),
        );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter" && expanded) {
      const option = matches[active];
      if (option) {
        event.preventDefault();
        choose(option);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <input
        ref={input}
        id={id}
        name={name}
        value={value}
        placeholder={
          placeholder && options.length > 0
            ? `${placeholder} (start typing)`
            : placeholder
        }
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && active >= 0 ? optionId(active) : undefined
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          setOpen(true);
          setActive(-1);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="border border-muted bg-background px-2 py-1 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      />
      <div
        hidden={!expanded}
        className="absolute top-full z-10 mt-1 w-full border border-muted bg-surface"
      >
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="max-h-64 overflow-y-auto"
        >
          {matches.map((option, index) => (
            <li
              key={option}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              // mousedown, not click: it runs before the input's blur closes the list.
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onMouseMove={() => setActive(index)}
              className="cursor-pointer px-2 py-1 aria-selected:bg-background aria-selected:underline"
            >
              <span aria-hidden className="inline-block w-3">
                {index === active ? "›" : ""}
              </span>
              {option}
            </li>
          ))}
        </ul>
        {/* Outside the listbox, which may only hold options. */}
        {hidden > 0 && (
          <p className="border-t border-muted px-2 py-1 text-sm text-muted tabular-nums">
            +{hidden} more, keep typing to narrow it down
          </p>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-sm">
          ✕ {error}
        </p>
      )}
    </div>
  );
}
