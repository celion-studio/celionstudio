"use client";

import { useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { EbookPlan } from "@/lib/ebook-generation";
import { CelionButton } from "@/components/ui/celion-controls";

type Props = {
  plan: EbookPlan | null;
  planning?: boolean;
  onBackToSource?: () => void;
  onRegeneratePlan?: () => void;
  onPlanChange?: (plan: EbookPlan) => void;
  onEditingChange?: (editing: boolean) => void;
};

const inputStyle = {
  width: "100%",
  border: "1px solid #dfe3e8",
  borderRadius: "6px",
  background: "#ffffff",
  color: "#17191d",
  fontFamily: "'Geist', sans-serif",
  fontSize: "13px",
  lineHeight: 1.45,
  padding: "9px 10px",
  outline: "none",
} as const;

function clonePlan(plan: EbookPlan): EbookPlan {
  return {
    ...plan,
    sourceAssessment: {
      ...plan.sourceAssessment,
      detectedSections: [...plan.sourceAssessment.detectedSections],
      essentialSections: [...plan.sourceAssessment.essentialSections],
      coveragePlan: [...plan.sourceAssessment.coveragePlan],
    },
    cover: { ...plan.cover },
    editorialStrategy: { ...plan.editorialStrategy },
    designBrief: {
      ...plan.designBrief,
      avoid: [...plan.designBrief.avoid],
    },
    slides: plan.slides.map((slide) => ({
      ...slide,
      sourceAnchors: [...slide.sourceAnchors],
    })),
  };
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
      <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", color: "#8b9098" }}>
        {label}
      </span>
      <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "13px", lineHeight: 1.35, color: "#17191d", fontWeight: 500 }}>
        {value || "-"}
      </span>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
      <h3 style={{ margin: 0, fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 600, color: "#17191d" }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              padding: "10px 12px",
              fontFamily: "'Geist', sans-serif",
              fontSize: "12.5px",
              lineHeight: 1.5,
              color: "#4f5661",
              background: "#ffffff",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanStepEbook({
  plan,
  planning = false,
  onBackToSource,
  onRegeneratePlan,
  onPlanChange,
  onEditingChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draftPlan, setDraftPlan] = useState<EbookPlan | null>(null);

  if (!plan) {
    return (
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "22px", background: "#ffffff" }}>
        <p style={{ margin: 0, fontFamily: "'Geist', sans-serif", fontSize: "13px", color: "#737982" }}>
          Plan will appear here after Celion reads your source.
        </p>
      </div>
    );
  }

  const visiblePlan = editing && draftPlan ? draftPlan : plan;
  const visibleAssessment = visiblePlan.sourceAssessment;
  const strategy = visiblePlan.editorialStrategy;
  const design = visiblePlan.designBrief;

  function updateDraft(updater: (current: EbookPlan) => EbookPlan) {
    setDraftPlan((current) => current ? updater(current) : current);
  }

  function startEditing() {
    if (!plan) return;
    setDraftPlan(clonePlan(plan));
    setEditing(true);
    onEditingChange?.(true);
  }

  function cancelEditing() {
    setDraftPlan(null);
    setEditing(false);
    onEditingChange?.(false);
  }

  function saveEditing() {
    if (draftPlan) onPlanChange?.(draftPlan);
    setDraftPlan(null);
    setEditing(false);
    onEditingChange?.(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <section style={{ border: "1px solid #dfe3e8", borderRadius: "6px", overflow: "hidden", background: "#ffffff" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #eceff2", display: "grid", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <p style={{ margin: "0 0 9px", fontFamily: "'Geist', sans-serif", fontSize: "11px", color: "#8b9098" }}>
                Plan
              </p>
              {editing && draftPlan ? (
                <div style={{ display: "grid", gap: "8px" }}>
                  <input
                    value={draftPlan.title}
                    onChange={(event) => updateDraft((current) => ({ ...current, title: event.target.value }))}
                    style={{ ...inputStyle, fontSize: "20px", fontWeight: 500 }}
                    aria-label="Plan title"
                  />
                  <input
                    value={draftPlan.subtitle}
                    onChange={(event) => updateDraft((current) => ({ ...current, subtitle: event.target.value }))}
                    style={inputStyle}
                    aria-label="Plan subtitle"
                  />
                </div>
              ) : (
                <>
                  <h2 style={{ margin: 0, fontFamily: "'Geist', sans-serif", fontSize: "25px", lineHeight: 1.1, letterSpacing: 0, color: "#111317", fontWeight: 500 }}>
                    {visiblePlan.title}
                  </h2>
                  {visiblePlan.subtitle ? (
                    <p style={{ margin: "10px 0 0", fontFamily: "'Geist', sans-serif", fontSize: "13px", lineHeight: 1.5, color: "#626974" }}>
                      {visiblePlan.subtitle}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {editing ? (
                <>
                  <CelionButton onClick={cancelEditing} size="md">
                    Cancel
                  </CelionButton>
                  <CelionButton onClick={saveEditing} size="md" variant="primary">
                    Save edits
                  </CelionButton>
                </>
              ) : (
                <>
                  <CelionButton onClick={onBackToSource} disabled={planning} size="md">
                    <ArrowLeft size={13} />
                    Back to source
                  </CelionButton>
                  <CelionButton onClick={onRegeneratePlan} disabled={planning} size="md">
                    <RefreshCw size={13} />
                    {planning ? "Regenerating..." : "Regenerate"}
                  </CelionButton>
                  <CelionButton onClick={startEditing} disabled={planning} size="md">
                    Edit plan
                  </CelionButton>
                </>
              )}
            </div>
          </div>
          {editing && draftPlan ? (
            <label style={{ display: "grid", gap: "7px" }}>
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", color: "#8b9098" }}>Reader promise</span>
              <textarea
                value={draftPlan.readerPromise}
                onChange={(event) => updateDraft((current) => ({ ...current, readerPromise: event.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1px",
            background: "#eceff2",
          }}
        >
          <div style={{ background: "#ffffff", padding: "14px 16px" }}>
            <Field label="Pages" value={visibleAssessment.recommendedSlideCount} />
          </div>
          <div style={{ background: "#ffffff", padding: "14px 16px" }}>
            <Field label="Source scale" value={visibleAssessment.sourceScale} />
          </div>
          <div style={{ background: "#ffffff", padding: "14px 16px" }}>
            <Field label="Risk" value={visibleAssessment.compressionRisk} />
          </div>
          <div style={{ background: "#ffffff", padding: "14px 16px" }}>
            <Field label="Language" value={visiblePlan.language} />
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px", background: "#ffffff" }}>
          <h3 style={{ margin: "0 0 12px", fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 600, color: "#17191d" }}>
            Editorial direction
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Field label="Angle" value={strategy.angle} />
            <Field label="Reader problem" value={strategy.readerProblem} />
            <Field label="Outcome" value={strategy.promisedOutcome} />
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px", background: "#ffffff" }}>
          <h3 style={{ margin: "0 0 12px", fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 600, color: "#17191d" }}>
            Design direction
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Field label="Mood" value={design.mood} />
            <Field label="Visual system" value={design.visualSystem} />
            <Field label="Layout rhythm" value={design.layoutRhythm} />
          </div>
        </div>
      </section>

      <ListBlock title="Coverage plan" items={visibleAssessment.coveragePlan} />

      <section style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <h3 style={{ margin: 0, fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 600, color: "#17191d" }}>
          Page plan
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "10px" }}>
          {visiblePlan.slides.map((slide, index) => (
            <article
              key={`page-${index}`}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "13px 14px",
                background: "#ffffff",
                minHeight: "172px",
                display: "flex",
                flexDirection: "column",
                gap: "9px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", color: "#8b9098" }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", color: "#6f7680" }}>
                  {slide.role}
                </span>
              </div>
              {editing && draftPlan ? (
                <div style={{ display: "grid", gap: "8px" }}>
                  <input
                    value={slide.headline}
                    onChange={(event) => updateDraft((current) => ({
                      ...current,
                      slides: current.slides.map((item, slideIndex) =>
                        slideIndex === index ? { ...item, headline: event.target.value } : item,
                      ),
                    }))}
                    style={inputStyle}
                    aria-label={`Page ${index + 1} headline`}
                  />
                  <textarea
                    value={slide.body}
                    onChange={(event) => updateDraft((current) => ({
                      ...current,
                      slides: current.slides.map((item, slideIndex) =>
                        slideIndex === index ? { ...item, body: event.target.value } : item,
                      ),
                    }))}
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical" }}
                    aria-label={`Page ${index + 1} body`}
                  />
                </div>
              ) : (
                <>
                  {slide.eyebrow ? (
                    <p style={{ margin: 0, fontFamily: "'Geist', sans-serif", fontSize: "11px", color: "#8b9098" }}>
                      {slide.eyebrow}
                    </p>
                  ) : null}
                  <h4 style={{ margin: 0, fontFamily: "'Geist', sans-serif", fontSize: "17px", lineHeight: 1.15, letterSpacing: 0, fontWeight: 500, color: "#111317" }}>
                    {slide.headline}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "'Geist', sans-serif",
                      fontSize: "12px",
                      lineHeight: 1.45,
                      color: "#626974",
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {slide.body}
                  </p>
                  {slide.sourceAnchors.length > 0 ? (
                    <p style={{ margin: "auto 0 0", fontFamily: "'Geist', sans-serif", fontSize: "11px", lineHeight: 1.4, color: "#8b9098" }}>
                      {slide.sourceAnchors.slice(0, 2).join(" / ")}
                    </p>
                  ) : null}
                </>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
