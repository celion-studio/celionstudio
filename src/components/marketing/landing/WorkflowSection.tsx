export function WorkflowSection() {
  return (
    <section id="how-it-works" className="section workflow-section">
      <div className="container">
        <div className="section-head fade-up">
          <h2 className="section-h">From source to shareable ebook.</h2>
          <p className="section-aside">
            Three simple stages. No complex setup, no blank page anxiety.
          </p>
        </div>

        <div className="workflow-row">
          <div className="workflow-step fade-up">
            <div className="workflow-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <span className="workflow-number">01</span>
            <h3>Bring source</h3>
            <p>Paste notes, research, or transcripts. Celion reads the material and extracts the core ideas.</p>
          </div>
          <div className="workflow-connector" aria-hidden="true"></div>
          <div className="workflow-step fade-up">
            <div className="workflow-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
            </div>
            <span className="workflow-number">02</span>
            <h3>Shape the plan</h3>
            <p>Review the structured outline. Adjust chapters, promises, and page flow before generating.</p>
          </div>
          <div className="workflow-connector" aria-hidden="true"></div>
          <div className="workflow-step fade-up">
            <div className="workflow-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <span className="workflow-number">03</span>
            <h3>Edit and export</h3>
            <p>Polish the generated pages in the editor, then export to PDF or HTML when ready.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
