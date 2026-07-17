"use client";

import { type Job } from "../data/mock-jobs";
import { Badge } from "@/components/ui/badge";

interface JobCardProps {
  job: Job;
  onApply: (job: Job) => void;
  onClickCard?: () => void;
  isApplying?: boolean;
}

export function JobCard({
  job,
  onApply,
  onClickCard,
  isApplying = false,
}: JobCardProps) {
  return (
    <div
      onClick={onClickCard}
      className={`bg-surface border border-border hover:border-primary/35 rounded-[var(--radius)] p-6 shadow-[var(--shadow)] hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4 group hover:-translate-y-0.5 ${onClickCard ? "cursor-pointer" : ""}`}
    >
      <div className="flex flex-col gap-3">
        {/* Header: Company & Title */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            {job.company}
          </span>
          <h3 className="text-lg font-bold font-display text-text mt-1 group-hover:text-primary transition-colors">
            {job.title}
          </h3>
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply(job);
          }}
          disabled={isApplying}
          className="w-full h-10 bg-primary hover:bg-primary-hover active:scale-[0.98] text-white font-semibold text-xs rounded-[var(--radius)] transition-all shadow-sm hover:cursor-pointer flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isApplying ? "Postulando…" : "Postularse"}
        </button>
      </div>
    </div>
  );
}
