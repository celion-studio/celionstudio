export function EditorProofSection() {
  return (
    <section id="preview" className="section editor-proof-section">
      <div className="container">
        <div className="preview-band">
          <div className="preview-features fade-up">
            <h3 className="section-h">Not just generated text. Editable ebook pages.</h3>
            <div className="preview-points">
              <div className="preview-point">
                <strong>Plan-led generation</strong>
                <span>The ebook is shaped around the reader, the promise, and the source material before pages are written.</span>
              </div>
              <div className="preview-point">
                <strong>Editable page structure</strong>
                <span>The draft arrives as compact pages you can revise, reorder, and export instead of rebuilding from a wall of text.</span>
              </div>
            </div>
          </div>

          <div className="editor-proof-mockup fade-up" aria-hidden="true">
            <div className="editor-proof-window">
              <div className="editor-proof-top">
                <div className="editor-proof-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="editor-proof-title">celion / ebook-studio</span>
              </div>
              <div className="editor-proof-body">
                <aside className="editor-proof-rail">
                  <div className="editor-proof-thumb">
                    <div className="editor-proof-thumb-line"></div>
                    <div className="editor-proof-thumb-line"></div>
                  </div>
                  <div className="editor-proof-thumb">
                    <div className="editor-proof-thumb-line"></div>
                    <div className="editor-proof-thumb-line"></div>
                    <div className="editor-proof-thumb-line"></div>
                  </div>
                  <div className="editor-proof-thumb" data-active="true">
                    <div className="editor-proof-thumb-line"></div>
                    <div className="editor-proof-thumb-line editor-proof-thumb-line--short"></div>
                  </div>
                  <div className="editor-proof-thumb">
                    <div className="editor-proof-thumb-line"></div>
                    <div className="editor-proof-thumb-line"></div>
                  </div>
                </aside>
                <div className="editor-proof-page">
                  <div className="editor-proof-breadcrumb">Chapter 01 / The Reader Promise</div>
                  <div className="editor-proof-kicker">A good ebook</div>
                  <h4>Does more than summarize.</h4>
                  <p>It gives the reader a clear way to understand, decide, or act. Every page should move the reader forward — not just fill space.</p>
                  <div className="editor-proof-toolbar">
                    <span>Paragraph</span>
                    <span className="editor-proof-toolbar-divider"></span>
                    <span>B</span>
                    <span className="editor-proof-toolbar-divider"></span>
                    <span>I</span>
                    <span className="editor-proof-toolbar-divider"></span>
                    <span>≡</span>
                  </div>
                  <div className="editor-proof-content">
                    <p>Start with what the reader already knows, then introduce the gap. A promise bridges that gap.</p>
                    <p className="editor-proof-selected">The reader should finish this chapter knowing exactly what they will gain — and why it matters to them specifically.</p>
                    <p>A strong promise is specific, measurable, and outcome-oriented.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
