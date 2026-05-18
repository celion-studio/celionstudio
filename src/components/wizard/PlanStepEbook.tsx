"use client";

import { useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { SlidePlan } from "@/lib/slide-generation";
import { CelionButton } from "@/components/ui/celion-controls";

type Props = {
  plan: SlidePlan | null;
  planning?: boolean;
  onBackToSource?: () => void;
  onRegeneratePlan?: () => void;
  onPlanChange?: (plan: SlidePlan) => void;
  onEditingChange?: (editing: boolean) => void;
};

function clonePlan(plan: SlidePlan): SlidePlan {
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
    <div className="wizard-plan-field">
      <span className="wizard-plan-field-label">
        {label}
      </span>
      <span className="wizard-plan-field-value">
        {value || "-"}
      </span>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="wizard-plan-field-list">
      <h3 className="wizard-plan-card-title">
        {title}
      </h3>
      <div className="wizard-plan-field-list">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="wizard-plan-list-item"
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
  const [draftPlan, setDraftPlan] = useState<SlidePlan | null>(null);

  if (!plan) {
    return (
      <div className="wizard-plan-empty">
        <p className="wizard-plan-muted">
          Plan will appear here after Celion reads your source.
        </p>
      </div>
    );
  }

  const visiblePlan = editing && draftPlan ? draftPlan : plan;
  const cover = visiblePlan.cover;
  const strategy = visiblePlan.editorialStrategy;
  const design = visiblePlan.designBrief;

  function updateDraft(updater: (current: SlidePlan) => SlidePlan) {
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
    <div className="wizard-plan-stack">
      <section className="wizard-plan-shell">
        <div className="wizard-plan-header">
          <div className="wizard-plan-header-row">
            <div className="wizard-plan-title-area">
              <p className="wizard-plan-kicker">
                Plan
              </p>
              {editing && draftPlan ? (
                <div className="wizard-plan-edit-grid">
                  <input
                    value={draftPlan.title}
                    onChange={(event) => updateDraft((current) => ({ ...current, title: event.target.value }))}
                    className="wizard-plan-input wizard-plan-input-title"
                    aria-label="Plan title"
                  />
                  <input
                    value={draftPlan.subtitle}
                    onChange={(event) => updateDraft((current) => ({ ...current, subtitle: event.target.value }))}
                    className="wizard-plan-input"
                    aria-label="Plan subtitle"
                  />
                </div>
              ) : (
                <>
                  <h2 className="wizard-plan-title">
                    {visiblePlan.title}
                  </h2>
                  {visiblePlan.subtitle ? (
                    <p className="wizard-plan-subtitle">
                      {visiblePlan.subtitle}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <div className="wizard-plan-actions">
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
            <label className="wizard-plan-field-wrap">
              <span className="wizard-plan-field-label">Reader promise</span>
              <textarea
                value={draftPlan.readerPromise}
                onChange={(event) => updateDraft((current) => ({ ...current, readerPromise: event.target.value }))}
                rows={3}
                className="wizard-plan-input wizard-plan-textarea"
              />
            </label>
          ) : null}
        </div>

        <div className="wizard-plan-stats">
          <div className="wizard-plan-stat-cell">
            <Field label="Pages" value={visiblePlan.slides.length} />
          </div>
          <div className="wizard-plan-stat-cell">
            <Field label="Language" value={visiblePlan.language} />
          </div>
        </div>
      </section>

      <section className="wizard-plan-card">
        <h3 className="wizard-plan-card-title">
          Cover
        </h3>
        <div className="wizard-plan-cover-grid">
          <Field label="Eyebrow" value={cover.eyebrow} />
          <Field label="Title" value={cover.title} />
          <Field label="Subtitle" value={cover.subtitle} />
          <Field label="Promise" value={cover.promise} />
          <Field label="Visual direction" value={cover.visualDirection} />
        </div>
      </section>

      <section className="wizard-plan-two-column">
        <div className="wizard-plan-card">
          <h3 className="wizard-plan-card-title">
            Editorial direction
          </h3>
          <div className="wizard-plan-field-list">
            <Field label="Angle" value={strategy.angle} />
            <Field label="Reader problem" value={strategy.readerProblem} />
            <Field label="Outcome" value={strategy.promisedOutcome} />
          </div>
        </div>

        <div className="wizard-plan-card">
          <h3 className="wizard-plan-card-title">
            Design direction
          </h3>
          <div className="wizard-plan-field-list">
            <Field label="Mood" value={design.mood} />
            <Field label="Visual system" value={design.visualSystem} />
            <Field label="Layout rhythm" value={design.layoutRhythm} />
          </div>
        </div>
      </section>

      <section className="wizard-plan-page-section">
        <h3 className="wizard-plan-page-section-title">
          Page plan
        </h3>
        <div className="wizard-plan-page-grid">
          {visiblePlan.slides.map((slide, index) => (
            <article
              key={`page-${index}`}
              className="wizard-plan-slide"
            >
              <div className="wizard-plan-slide-meta">
                <span className="wizard-plan-slide-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="wizard-plan-slide-role">
                  {slide.role}
                </span>
              </div>
              {editing && draftPlan ? (
                <div className="wizard-plan-edit-grid">
                  <input
                    value={slide.headline}
                    onChange={(event) => updateDraft((current) => ({
                      ...current,
                      slides: current.slides.map((item, slideIndex) =>
                        slideIndex === index ? { ...item, headline: event.target.value } : item,
                      ),
                    }))}
                    className="wizard-plan-input"
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
                    className="wizard-plan-input wizard-plan-textarea"
                    aria-label={`Page ${index + 1} body`}
                  />
                </div>
              ) : (
                <>
                  {slide.eyebrow ? (
                    <p className="wizard-plan-slide-eyebrow">
                      {slide.eyebrow}
                    </p>
                  ) : null}
                  <h4 className="wizard-plan-slide-title">
                    {slide.headline}
                  </h4>
                  <p className="wizard-plan-slide-body">
                    {slide.body}
                  </p>
                  {slide.sourceAnchors.length > 0 ? (
                    <p className="wizard-plan-anchors">
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
