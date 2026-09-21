import { startsWithLetter } from "@/utils/equipment.names.utils";
import { X } from "lucide-react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

export interface ComboboxOption {value:string;label:string;hint?:string}
interface ComboboxProps {
    options:ComboboxOption[];
    onSelect: (option: ComboboxOption | null) => void;
    placeholder?:string;
    ariaLabel?:string;
    autoFocus?:boolean;
}

export function Combobox({options,onSelect,placeholder,ariaLabel,autoFocus}:ComboboxProps) {
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  // Con autoFocus el campo queda listo para escribir, pero la lista solo se
  // abre al escribir o al pulsar la flecha abajo (no sola al cargar la página).
  const skipFocusOpen = useRef(!!autoFocus);
  const [query,setQuery] = useState("");
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState(0);

  const shown = useMemo(
    () => options.filter((o) => startsWithLetter(o.label, query)).slice(0,50),
    [options,query],
  )

  useEffect(() => {
    const onDown = (e:MouseEvent) => {
        if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown",onDown);
    return () => document.removeEventListener("mousedown",onDown);
  },[]);

  // Mantiene visible la opción resaltada al navegar con las flechas.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, listId]);

  const choose = (o:ComboboxOption) => {
    setQuery(o.label);
    setOpen(false);
    onSelect(o);
  }
  
  const clear = () => {
    setQuery("");
    setOpen(false);
    onSelect(null);
  }

  const onKeyDown = (e:React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setActive((i) => Math.min(i+1, shown.length -1));
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i-1,0)); 
    } else if (e.key === "Enter" && open && shown[active]) {
        e.preventDefault();
        choose(shown[active]);
    } else if (e.key === "Escape") setOpen(false);
  }
  return (
    <div ref={boxRef} className="relative">
      <input
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel ?? placeholder} autoFocus={autoFocus}
        value={query} placeholder={placeholder} onKeyDown={onKeyDown}
        onFocus={() => { if (skipFocusOpen.current) { skipFocusOpen.current = false; return; } setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); if (!e.target.value) onSelect(null); }}
        className="w-full rounded-lg border border-app bg-surface px-3 py-2.5 pr-9 text-sm text-app outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      />
      {query && (
        <button type="button" onClick={clear} aria-label="Quitar selección" className="absolute inset-y-0 right-2 text-app-muted hover:text-app">
          <X size={16} />
        </button>
      )}
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-app bg-surface py-1 shadow-lg">
          {shown.length === 0 ? (
            <li className="px-3 py-2 text-sm text-app-muted">Sin coincidencias</li>
          ) : shown.map((o, i) => (
            <li key={o.value} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-[var(--color-primary)]/10" : ""}`}>
              {o.label}{o.hint && <span className="ml-2 font-mono text-xs text-app-muted">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
