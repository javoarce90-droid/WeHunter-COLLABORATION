"use client";

import { type Job } from "../data/mock-jobs";
import { Badge } from "@/components/ui/badge";

interface JobCardProps {
  job: Job;
  isFavorite: boolean;
  isApplied: boolean;
  isHidden: boolean;
  onToggleFavorite: (jobId: string) => void;
  onHide: (jobId: string) => void;
  onApply: (job: Job) => void;
  onClickCard?: () => void;
}

export function JobCard({
  job,
  isFavorite,
  isApplied,
  isHidden,
  onToggleFavorite,
  onHide,
  onApply,
  onClickCard,
}: JobCardProps) {
  return (
    <div 
      onClick={onClickCard}
      className={`bg-surface border border-border hover:border-primary/35 rounded-[var(--radius)] p-6 shadow-[var(--shadow)] hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4 group hover:-translate-y-0.5 ${onClickCard ? "cursor-pointer" : ""}`}
    >
      <div className="flex flex-col gap-3">
        {/* Header: Company & Favorite/Hide Actions */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              {job.company}
            </span>
            <h3 className="text-lg font-bold font-display text-text mt-1 group-hover:text-primary transition-colors">
              {job.title}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle Favorite Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(job.id);
              }}
              className="p-2 rounded-lg hover:bg-muted text-muted hover:text-danger active:scale-95 transition-all hover:cursor-pointer"
              title="Guardar favorito"
            >
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${
                  isFavorite ? "fill-danger text-danger scale-110" : "fill-none"
                }`}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>

            {/* Hide/Unhide Job Card Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHide(job.id);
              }}
              className={`p-2 rounded-lg hover:bg-muted active:scale-95 transition-all hover:cursor-pointer ${
                isHidden ? "text-primary bg-primary-light" : "text-muted hover:text-text"
              }`}
              title={isHidden ? "Mostrar oferta" : "Ocultar oferta"}
            >
              {isHidden ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Location & Workplace Type */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {job.location}
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            {job.workplaceType}
          </span>
        </div>

        {/* Short Description */}
        <p className="text-sm text-text/80 line-clamp-3 leading-relaxed mt-1">
          {job.description}
        </p>

        {/* Salary */}
        {job.salary && (
          <div className="text-sm font-semibold text-success/90 bg-success/5 border border-success/15 px-3 py-1 rounded-[var(--radius)] w-fit mt-1">
            {job.salary}
          </div>
        )}
      </div>

      {/* Footer: Tags & Apply Button */}
      <div className="flex flex-col gap-4 pt-2 border-t border-border/30">
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {job.tags.map((tag) => (
            <Badge
              key={tag}
              variant="muted"
              className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Apply Button */}
        {isApplied ? (
          <div className="w-full h-10 bg-success/10 text-success border border-success/20 font-semibold text-xs rounded-[var(--radius)] flex items-center justify-center gap-1.5 select-none">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            ¡Ya postulado!
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply(job);
            }}
            className="w-full h-10 bg-primary hover:bg-primary-hover active:scale-[0.98] text-white font-semibold text-xs rounded-[var(--radius)] transition-all shadow-sm hover:cursor-pointer flex items-center justify-center"
          >
            Postularse
          </button>
        )}
      </div>
    </div>
  );
}
