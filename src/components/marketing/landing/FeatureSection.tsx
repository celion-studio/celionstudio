export function FeatureSection() {
  return (
    <section id="features" className="section features-section">
      <div className="container">
        <div className="section-head fade-up">
          <h2 className="section-h">Everything you need to publish.</h2>
          <p className="section-aside">
            From first idea to finished ebook. No extra tools, no formatting headaches.
          </p>
        </div>
        <div className="features-list">
          <div className="feature-item fade-up">
            <h3>Source import</h3>
            <p>Paste notes, research, or transcripts. Celion extracts the core ideas automatically.</p>
          </div>
          <div className="feature-item fade-up">
            <h3>Plan builder</h3>
            <p>Structure your ebook with chapters, promises, and page flow before writing.</p>
          </div>
          <div className="feature-item fade-up">
            <h3>Editable drafts</h3>
            <p>Revise, reorder, and refine every page. Not a wall of text, but structured content.</p>
          </div>
          <div className="feature-item fade-up">
            <h3>Export ready</h3>
            <p>Download as PDF or clean HTML. Print-ready formatting, no post-processing needed.</p>
          </div>
          <div className="feature-item fade-up">
            <h3>Project organization</h3>
            <p>Keep multiple ebooks in one place. Switch between drafts without losing context.</p>
          </div>
          <div className="feature-item fade-up">
            <h3>A5 page preview</h3>
            <p>See exactly how your ebook renders page by page before you export or share it.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
