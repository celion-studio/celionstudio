import type { Route } from "next";
import Link from "next/link";

const PRICING_ROUTE = "/pricing" as Route;

export function MarketingFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid fade-up">
          <div className="footer-brand">
            <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f6f7f8', fontFamily: 'Geist', fontSize: '14px', fontWeight: 500 }}>
              <svg className="brand-spark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32" />
              </svg>
              <span>celion</span>
            </div>
            <p>Software for turning notes, transcripts, and research into editable ebook drafts.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#preview">Preview</Link>
            <Link href="/#export">Export</Link>
            <Link href={PRICING_ROUTE}>Pricing</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Celion 2026. All rights reserved.</span>
          <span>Designed for source-led ebooks you can still edit.</span>
        </div>
      </div>
    </footer>
  );
}
