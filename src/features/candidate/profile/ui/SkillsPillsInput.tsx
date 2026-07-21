"use client";

import { useState, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { fieldClasses } from "@/components/ui/input";

interface SkillsPillsInputProps {
  /** Nombre del input hidden que se manda en el FormData (mismo criterio que el resto del form). */
  name: string;
  initialSkills?: string[];
  label?: string;
  placeholder?: string;
  helpText?: string;
}

/** Alto aprox. de 2 filas de pills (24px cada una + 6px de gap entre filas). */
const COLLAPSED_MAX_HEIGHT = 60;

/**
 * Input de skills con pills: se escriben una por una (Enter o coma) y se listan debajo con
 * una X para sacarlas. Reemplaza al textbox de "separadas por coma" (difícil de editar a mano).
 * El form sigue recibiendo un string separado por comas vía el input hidden `name`. Con muchas
 * skills la lista se recorta a 2 filas con un "Ver más" (si no, la card queda desproporcionada).
 */
export function SkillsPillsInput({ name, initialSkills = [], label, placeholder, helpText }: SkillsPillsInputProps) {
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pillsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (expanded) return;
    const el = pillsRef.current;
    setHasMore(!!el && el.scrollHeight > el.clientHeight + 1);
  }, [skills, expanded]);

  const addSkill = () => {
    const value = draft.trim();
    if (!value) {
      setDraft("");
      return;
    }
    // Se agrega al principio de la lista: es lo último que cargó el usuario, lo más relevante.
    setSkills((prev) => (prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [value, ...prev]));
    setDraft("");
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-muted">{label}</label>}
      <input type="hidden" name={name} value={skills.join(",")} />
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addSkill}
        placeholder={placeholder}
        className={fieldClasses()}
      />
      {helpText && <p className="text-[10px] text-muted">{helpText}</p>}
      {skills.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-0.5">
          <div
            ref={pillsRef}
            style={{ maxHeight: expanded ? undefined : COLLAPSED_MAX_HEIGHT }}
            className="flex flex-wrap gap-1.5 overflow-hidden"
          >
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full bg-primary-light/60 border border-primary/20 pl-2.5 pr-1.5 py-1 text-xs font-medium text-primary"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="rounded-full p-0.5 text-primary/70 transition-colors hover:bg-primary/20 hover:text-primary"
                  aria-label={`Quitar ${skill}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="self-start text-[11px] font-semibold text-primary hover:text-primary-hover"
            >
              {expanded ? "Ver menos" : "Ver más"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
