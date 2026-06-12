"use client";

export default function WhitepaperPage() {
  return (
    <div className="lx-wrap">
      <div className="lx-pagehead">
        <div className="lx-kicker">Whitepaper · v1.0</div>
        <h1>Lacus: a tokenized bond protocol.</h1>
      </div>
      <div className="wp-ctrl num">
        <a href="/whitepaper.pdf" download>DOWNLOAD PDF ↗</a>
      </div>
      <div className="wp-viewer">
        <iframe src="/whitepaper.pdf" title="Lacus Whitepaper" />
      </div>
      <div style={{ paddingBottom: 48 }} />
    </div>
  );
}
