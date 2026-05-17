export function OutputTypesSection() {
  return (
    <section id="outputs" className="section output-section">
      <div className="container">
        <div className="section-head output-head fade-up">
          <h2 className="section-h">Create ebooks people can actually open.</h2>
          <p className="section-aside">
            Turn rough material into polished, editable pages for guides, workbooks, reports, and lead magnets.
          </p>
        </div>

        <div className="output-gallery">
          <article className="output-card output-card-guide fade-up">
            <div className="output-card-meta">
              <span>Guide</span>
              <span>14 pages</span>
            </div>
            <div className="output-cover">
              <div className="output-cover-spine" />
              <div className="output-cover-content">
                <div className="output-cover-kicker">Creator guide</div>
                <h3>Idea to Ebook</h3>
                <p className="output-cover-author">Celion Press</p>
              </div>
              <div className="output-cover-pages" />
            </div>
          </article>

          <article className="output-card output-card-workbook fade-up">
            <div className="output-card-meta">
              <span>Workbook</span>
              <span>18 pages</span>
            </div>
            <div className="output-cover">
              <div className="output-cover-spine" />
              <div className="output-cover-content">
                <div className="output-cover-kicker">Field notes</div>
                <h3>Launch Workbook</h3>
                <p className="output-cover-author">Celion Press</p>
              </div>
              <div className="output-cover-pages" />
            </div>
          </article>

          <article className="output-card output-card-report fade-up">
            <div className="output-card-meta">
              <span>Report</span>
              <span>10 pages</span>
            </div>
            <div className="output-cover">
              <div className="output-cover-spine" />
              <div className="output-cover-content">
                <div className="output-cover-kicker">Research brief</div>
                <h3>Market Signals</h3>
                <p className="output-cover-author">Celion Press</p>
              </div>
              <div className="output-cover-pages" />
            </div>
          </article>

          <article className="output-card output-card-playbook fade-up">
            <div className="output-card-meta">
              <span>Playbook</span>
              <span>22 pages</span>
            </div>
            <div className="output-cover">
              <div className="output-cover-spine" />
              <div className="output-cover-content">
                <div className="output-cover-kicker">Operating system</div>
                <h3>Creator Playbook</h3>
                <p className="output-cover-author">Celion Press</p>
              </div>
              <div className="output-cover-pages" />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
