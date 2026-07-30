"use client";

import { useState } from "react";
import type {
  CandidateWorkExperience,
  CandidateEducation,
  CandidateCertification,
  CandidateLanguage,
  LanguageLevel,
} from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Input, fieldClasses } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EMPLOYMENT_LABELS, MODALITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";

const selectClass = fieldClasses();

const LEVEL_LABELS: Record<LanguageLevel, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  nativo: "Nativo",
};

interface CandidateResumeFieldsProps {
  initialExperiences?: CandidateWorkExperience[];
  initialEducation?: CandidateEducation[];
  initialCertifications?: CandidateCertification[];
  initialLanguages?: CandidateLanguage[];
}

export function CandidateResumeFields({
  initialExperiences = [],
  initialEducation = [],
  initialCertifications = [],
  initialLanguages = [],
}: CandidateResumeFieldsProps) {
  const [experiences, setExperiences] = useState<CandidateWorkExperience[]>(initialExperiences);
  const [education, setEducation] = useState<CandidateEducation[]>(initialEducation);
  const [certifications, setCertifications] = useState<CandidateCertification[]>(initialCertifications);
  const [languages, setLanguages] = useState<CandidateLanguage[]>(initialLanguages);

  // Form states para agregar items
  const [addingExp, setAddingExp] = useState(false);
  const [expForm, setExpForm] = useState({
    company: "",
    position: "",
    startDate: "",
    endDate: "",
    description: "",
    employmentType: "",
    modality: "",
    skillsStr: "",
  });

  const [addingEdu, setAddingEdu] = useState(false);
  const [eduForm, setEduForm] = useState({
    institution: "",
    degree: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  const [addingCert, setAddingCert] = useState(false);
  const [certForm, setCertForm] = useState({
    name: "",
    url: "",
  });

  const [addingLang, setAddingLang] = useState(false);
  const [langForm, setLangForm] = useState({
    language: "",
    level: "intermedio",
  });

  // Handlers Experiencia
  const handleAddExperience = () => {
    if (!expForm.company.trim() || !expForm.position.trim()) return;
    const newExp: CandidateWorkExperience = {
      id: "temp-" + Date.now(),
      profileId: null,
      candidateId: null,
      company: expForm.company.trim(),
      position: expForm.position.trim(),
      startDate: expForm.startDate || null,
      endDate: expForm.endDate || null,
      description: expForm.description.trim() || null,
      employmentType: (expForm.employmentType as CandidateWorkExperience["employmentType"]) || null,
      modality: (expForm.modality as CandidateWorkExperience["modality"]) || null,
      skills: expForm.skillsStr ? expForm.skillsStr.split(",").map((s) => s.trim()).filter(Boolean) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setExperiences((prev) => [...prev, newExp]);
    setExpForm({
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      description: "",
      employmentType: "",
      modality: "",
      skillsStr: "",
    });
    setAddingExp(false);
  };

  const handleRemoveExperience = (id: string) => {
    setExperiences((prev) => prev.filter((item) => item.id !== id));
  };

  // Handlers Educación
  const handleAddEducation = () => {
    if (!eduForm.institution.trim() || !eduForm.degree.trim()) return;
    const newEdu: CandidateEducation = {
      id: "temp-" + Date.now(),
      profileId: null,
      candidateId: null,
      institution: eduForm.institution.trim(),
      degree: eduForm.degree.trim(),
      fieldOfStudy: eduForm.fieldOfStudy.trim() || null,
      startDate: eduForm.startDate || null,
      endDate: eduForm.endDate || null,
      description: eduForm.description.trim() || null,
      grade: null,
      activities: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEducation((prev) => [...prev, newEdu]);
    setEduForm({
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      description: "",
    });
    setAddingEdu(false);
  };

  const handleRemoveEducation = (id: string) => {
    setEducation((prev) => prev.filter((item) => item.id !== id));
  };

  // Handlers Certificaciones
  const handleAddCertification = () => {
    if (!certForm.name.trim()) return;
    const newCert: CandidateCertification = {
      id: "temp-" + Date.now(),
      profileId: null,
      candidateId: null,
      name: certForm.name.trim(),
      url: certForm.url.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCertifications((prev) => [...prev, newCert]);
    setCertForm({ name: "", url: "" });
    setAddingCert(false);
  };

  const handleRemoveCertification = (id: string) => {
    setCertifications((prev) => prev.filter((item) => item.id !== id));
  };

  // Handlers Idiomas
  const handleAddLanguage = () => {
    if (!langForm.language.trim()) return;
    const newLang: CandidateLanguage = {
      id: "temp-" + Date.now(),
      profileId: null,
      candidateId: null,
      language: langForm.language.trim(),
      level: (langForm.level as LanguageLevel) || "intermedio",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setLanguages((prev) => [...prev, newLang]);
    setLangForm({ language: "", level: "intermedio" });
    setAddingLang(false);
  };

  const handleRemoveLanguage = (id: string) => {
    setLanguages((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden inputs con JSON serializado */}
      <input type="hidden" name="experiencesJson" value={JSON.stringify(experiences)} />
      <input type="hidden" name="educationJson" value={JSON.stringify(education)} />
      <input type="hidden" name="certificationsJson" value={JSON.stringify(certifications)} />
      <input type="hidden" name="languagesJson" value={JSON.stringify(languages)} />

      {/* 💼 Experiencia laboral Card */}
      <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in">
        <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-text font-display">Experiencia laboral</h3>
              <p className="text-[11px] text-muted">Empresas, roles y proyectos anteriores</p>
            </div>
          </div>
          {!addingExp && (
            <button
              type="button"
              onClick={() => setAddingExp(true)}
              className="text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-md bg-primary-light/40 border border-primary/20 hover:border-primary/40 transition-all flex items-center gap-1"
            >
              + Añadir experiencia
            </button>
          )}
        </CardHeader>

        <CardContent className="p-5 flex flex-col gap-3">
          {experiences.length === 0 && !addingExp && (
            <div className="flex flex-col items-center justify-center py-6 px-4 bg-bg/40 rounded-[var(--radius)] border border-dashed border-border/70 text-center">
              <svg className="w-8 h-8 text-muted/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-xs font-medium text-text">No hay experiencias laborales registradas</p>
              <p className="text-[11px] text-muted mt-0.5">Sumá los puestos anteriores del candidato para enriquecer su perfil</p>
            </div>
          )}

          {experiences.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {experiences.map((exp) => (
                <li
                  key={exp.id}
                  className="flex items-start justify-between gap-3 p-3.5 rounded-[var(--radius)] border border-border/80 bg-bg/40 hover:bg-bg/70 transition-colors text-xs animate-pop-in"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-text">{exp.position}</span>
                      <span className="text-muted font-medium">@ {exp.company}</span>
                    </div>
                    <p className="text-[11px] text-muted">
                      {exp.startDate ? `${exp.startDate} – ${exp.endDate || "Actualidad"}` : "Fecha no especificada"}
                      {exp.employmentType && ` · ${EMPLOYMENT_LABELS[exp.employmentType] || exp.employmentType}`}
                      {exp.modality && ` · ${MODALITY_LABELS[exp.modality] || exp.modality}`}
                    </p>
                    {exp.description && (
                      <p className="mt-1 text-text/80 leading-relaxed text-xs">{exp.description}</p>
                    )}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {exp.skills.map((s) => (
                          <Badge key={s} variant="muted" className="text-[10px] px-2 py-0.5 font-medium">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExperience(exp.id)}
                    className="text-muted hover:text-danger shrink-0 p-1 font-bold text-sm transition-colors"
                    title="Eliminar experiencia"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {addingExp && (
            <div className="flex flex-col gap-3 p-4 rounded-[var(--radius)] border-l-4 border-l-primary border border-primary/20 bg-primary-light/10 text-xs animate-pop-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Empresa"
                  value={expForm.company}
                  onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                  placeholder="Ej. Acme Corp"
                  required
                />
                <Input
                  label="Cargo / Puesto"
                  value={expForm.position}
                  onChange={(e) => setExpForm({ ...expForm, position: e.target.value })}
                  placeholder="Ej. Desarrollador Fullstack"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Fecha de inicio (opcional)"
                  type="date"
                  value={expForm.startDate}
                  onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                />
                <Input
                  label="Fecha de fin (vacío = actualidad)"
                  type="date"
                  value={expForm.endDate}
                  onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-muted">Tipo de empleo</span>
                  <select
                    value={expForm.employmentType}
                    onChange={(e) => setExpForm({ ...expForm, employmentType: e.target.value })}
                    className={selectClass + " text-xs"}
                  >
                    <option value="">Sin especificar</option>
                    <option value="full_time">Jornada completa</option>
                    <option value="part_time">Media jornada</option>
                    <option value="contract">Contrato</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-muted">Modalidad</span>
                  <select
                    value={expForm.modality}
                    onChange={(e) => setExpForm({ ...expForm, modality: e.target.value })}
                    className={selectClass + " text-xs"}
                  >
                    <option value="">Sin especificar</option>
                    <option value="remote">Remoto</option>
                    <option value="hybrid">Híbrido</option>
                    <option value="onsite">Presencial</option>
                  </select>
                </label>
              </div>
              <Input
                label="Skills utilizadas (separadas por coma)"
                value={expForm.skillsStr}
                onChange={(e) => setExpForm({ ...expForm, skillsStr: e.target.value })}
                placeholder="React, TypeScript, Node.js"
              />
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-muted">Descripción</span>
                <textarea
                  rows={2}
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  placeholder="Principales funciones y logros..."
                  className={selectClass + " resize-y text-xs"}
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddingExp(false)}
                  className="px-3 py-1.5 font-semibold text-muted hover:text-text transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="px-4 py-1.5 bg-primary text-white font-semibold rounded-[var(--radius)] hover:bg-primary-hover transition-colors shadow-sm"
                >
                  Guardar experiencia
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🎓 Educación Card */}
      <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in [animation-delay:100ms]">
        <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-text font-display">Educación</h3>
              <p className="text-[11px] text-muted">Estudios universitarios, terciarios y cursos</p>
            </div>
          </div>
          {!addingEdu && (
            <button
              type="button"
              onClick={() => setAddingEdu(true)}
              className="text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-md bg-primary-light/40 border border-primary/20 hover:border-primary/40 transition-all flex items-center gap-1"
            >
              + Añadir estudio
            </button>
          )}
        </CardHeader>

        <CardContent className="p-5 flex flex-col gap-3">
          {education.length === 0 && !addingEdu && (
            <div className="flex flex-col items-center justify-center py-6 px-4 bg-bg/40 rounded-[var(--radius)] border border-dashed border-border/70 text-center">
              <svg className="w-8 h-8 text-muted/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
              </svg>
              <p className="text-xs font-medium text-text">No hay estudios o títulos registrados</p>
              <p className="text-[11px] text-muted mt-0.5">Ingresá la formación académica o capacitaciones académicas</p>
            </div>
          )}

          {education.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {education.map((edu) => (
                <li
                  key={edu.id}
                  className="flex items-start justify-between gap-3 p-3.5 rounded-[var(--radius)] border border-border/80 bg-bg/40 hover:bg-bg/70 transition-colors text-xs animate-pop-in"
                >
                  <div>
                    <p className="font-bold text-sm text-text">{edu.degree}</p>
                    <p className="text-muted font-medium">{edu.institution} {edu.fieldOfStudy && `· ${edu.fieldOfStudy}`}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEducation(edu.id)}
                    className="text-muted hover:text-danger shrink-0 p-1 font-bold text-sm transition-colors"
                    title="Eliminar estudio"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {addingEdu && (
            <div className="flex flex-col gap-3 p-4 rounded-[var(--radius)] border-l-4 border-l-primary border border-primary/20 bg-primary-light/10 text-xs animate-pop-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Institución"
                  value={eduForm.institution}
                  onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
                  placeholder="Ej. Universidad de Buenos Aires"
                  required
                />
                <Input
                  label="Título / Carrera"
                  value={eduForm.degree}
                  onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                  placeholder="Ej. Licenciatura en Sistemas"
                  required
                />
              </div>
              <Input
                label="Área de estudio (opcional)"
                value={eduForm.fieldOfStudy}
                onChange={(e) => setEduForm({ ...eduForm, fieldOfStudy: e.target.value })}
                placeholder="Ej. Ciencias de la Computación"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddingEdu(false)}
                  className="px-3 py-1.5 font-semibold text-muted hover:text-text transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddEducation}
                  className="px-4 py-1.5 bg-primary text-white font-semibold rounded-[var(--radius)] hover:bg-primary-hover transition-colors shadow-sm"
                >
                  Guardar estudio
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 📜 Certificaciones & 🌐 Idiomas */}
      <div className="grid grid-cols-1 gap-6">
        {/* Certificaciones Card */}
        <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in [animation-delay:200ms]">
          <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-text font-display">Certificaciones</h3>
                <p className="text-[11px] text-muted">Certificados oficiales o exámenes</p>
              </div>
            </div>
            {!addingCert && (
              <button
                type="button"
                onClick={() => setAddingCert(true)}
                className="text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-md bg-primary-light/40 border border-primary/20 hover:border-primary/40 transition-all flex items-center gap-1"
              >
                + Añadir
              </button>
            )}
          </CardHeader>

          <CardContent className="p-5 flex flex-col gap-3">
            {certifications.length === 0 && !addingCert && (
              <div className="flex flex-col items-center justify-center py-5 px-4 bg-bg/40 rounded-[var(--radius)] border border-dashed border-border/70 text-center">
                <p className="text-xs text-muted">Sin certificaciones registradas</p>
              </div>
            )}

            {certifications.length > 0 && (
              <ul className="flex flex-col gap-2">
                {certifications.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 p-3 rounded-[var(--radius)] border border-border/80 bg-bg/40 text-xs animate-pop-in">
                    <span className="font-semibold text-text truncate">{c.name}</span>
                    <button type="button" onClick={() => handleRemoveCertification(c.id)} className="text-muted hover:text-danger p-1 font-bold text-xs transition-colors">✕</button>
                  </li>
                ))}
              </ul>
            )}

            {addingCert && (
              <div className="flex flex-col gap-3 p-4 rounded-[var(--radius)] border-l-4 border-l-primary border border-primary/20 bg-primary-light/10 text-xs animate-pop-in">
                <Input
                  label="Nombre de la certificación"
                  value={certForm.name}
                  onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  placeholder="Ej. AWS Certified Solutions Architect"
                  required
                />
                <Input
                  label="URL del certificado (opcional)"
                  value={certForm.url}
                  onChange={(e) => setCertForm({ ...certForm, url: e.target.value })}
                  placeholder="https://..."
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setAddingCert(false)} className="px-3 py-1 text-muted hover:text-text">Cancelar</button>
                  <button type="button" onClick={handleAddCertification} className="px-4 py-1.5 bg-primary text-white rounded-[var(--radius)] font-semibold hover:bg-primary-hover shadow-sm">Guardar</button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Idiomas Card */}
        <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in [animation-delay:250ms]">
          <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-text font-display">Idiomas</h3>
                <p className="text-[11px] text-muted">Idiomas y nivel de dominio</p>
              </div>
            </div>
            {!addingLang && (
              <button
                type="button"
                onClick={() => setAddingLang(true)}
                className="text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-md bg-primary-light/40 border border-primary/20 hover:border-primary/40 transition-all flex items-center gap-1"
              >
                + Añadir
              </button>
            )}
          </CardHeader>

          <CardContent className="p-5 flex flex-col gap-3">
            {languages.length === 0 && !addingLang && (
              <div className="flex flex-col items-center justify-center py-5 px-4 bg-bg/40 rounded-[var(--radius)] border border-dashed border-border/70 text-center">
                <p className="text-xs text-muted">Sin idiomas registrados</p>
              </div>
            )}

            {languages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {languages.map((l) => (
                  <span key={l.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light/70 text-primary-hover text-xs font-semibold border border-primary/20 animate-pop-in">
                    {l.language} ({LEVEL_LABELS[l.level] || l.level})
                    <button type="button" onClick={() => handleRemoveLanguage(l.id)} className="hover:text-danger font-bold ml-1 transition-colors">✕</button>
                  </span>
                ))}
              </div>
            )}

            {addingLang && (
              <div className="flex flex-col gap-3 p-4 rounded-[var(--radius)] border-l-4 border-l-primary border border-primary/20 bg-primary-light/10 text-xs animate-pop-in">
                <Input
                  label="Idioma"
                  value={langForm.language}
                  onChange={(e) => setLangForm({ ...langForm, language: e.target.value })}
                  placeholder="Ej. Inglés"
                  required
                />
                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-muted">Nivel de dominio</span>
                  <select
                    value={langForm.level}
                    onChange={(e) => setLangForm({ ...langForm, level: e.target.value })}
                    className={selectClass + " text-xs"}
                  >
                    <option value="basico">Básico</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                    <option value="nativo">Nativo</option>
                  </select>
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setAddingLang(false)} className="px-3 py-1 text-muted hover:text-text">Cancelar</button>
                  <button type="button" onClick={handleAddLanguage} className="px-4 py-1.5 bg-primary text-white rounded-[var(--radius)] font-semibold hover:bg-primary-hover shadow-sm">Guardar</button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
