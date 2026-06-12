"use client";

export default function PitchPage() {
  return (
    <div className="lx-wrap">
      <div className="lx-pagehead">
        <div className="lx-kicker">Investor deck</div>
        <h1>The Lacus pitch.</h1>
      </div>
      <div className="wp-ctrl num">
        <a href="/pitch.pdf" download>DOWNLOAD PDF ↗</a>
      </div>
      <div className="wp-viewer">
        <iframe src="/pitch.pdf" title="Lacus Pitch Deck" />
      </div>
      <div style={{ paddingBottom: 48 }} />
    </div>
  );
}
