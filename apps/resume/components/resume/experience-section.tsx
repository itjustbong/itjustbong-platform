"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "./section-header";
import { experiences } from "@/lib/resume-data";
import { HighlightText } from "@/lib/highlight-text";
import { Building2, ChevronRight } from "lucide-react";

// 대학 졸업 구분선 컴포넌트
function GraduationDivider() {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        대학 졸업
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function ExperienceSection() {
  // "대학 재학 중"이 포함된 첫 번째 경험의 인덱스 찾기
  const firstUndergraduateIndex = experiences.findIndex((exp) =>
    exp.period.includes("대학 재학 중")
  );

  return (
    <section className="mb-12" id="experience">
      <SectionHeader title="Experience" />
      <div className="space-y-8">
        {experiences.map((exp, index) => (
          <div key={exp.company}>
            {/* 졸업 후 경험과 재학 중 경험 사이에 구분선 표시 */}
            {index === firstUndergraduateIndex && firstUndergraduateIndex > 0 && (
              <GraduationDivider />
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative pl-6 border-l-2 border-border hover:border-accent/50 transition-colors"
            >
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-accent border-2 border-background" />
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" />
                <h3 className="font-semibold text-lg text-foreground">
                  {exp.company}
                </h3>
              </div>
              <span className="text-sm text-muted-foreground font-mono">
                {exp.period}
              </span>
            </div>

            <div className="space-y-4">
              {exp.projects.map((project) => (
                <div key={project.name} className="group">
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-1">
                    <ChevronRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {project.name}
                  </h4>
                  <ul className="space-y-1.5 ml-5">
                    {project.highlights.map((highlight, i) => (
                      <li
                        key={i}
                        className="text-sm text-muted-foreground leading-relaxed relative before:content-[''] before:absolute before:-left-3 before:top-2 before:w-1 before:h-1 before:rounded-full before:bg-muted-foreground/50"
                      >
                        <HighlightText text={highlight} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {exp.activities && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Activities
                </h4>
                <ul className="space-y-1">
                  {exp.activities.map((activity, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground leading-relaxed relative pl-3 before:content-[''] before:absolute before:left-0 before:top-2 before:w-1 before:h-1 before:rounded-full before:bg-accent/50"
                    >
                      <HighlightText text={activity} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}
