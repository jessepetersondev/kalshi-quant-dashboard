export function VisibilityOmissionNotice() {
  return (
    <div className="state-panel" style={{ margin: 0, maxWidth: "none" }}>
      <p className="eyebrow">Restricted</p>
      <h1 style={{ fontSize: "1.15rem" }}>Raw payloads withheld</h1>
      <p className="muted">
        This session can inspect normalized lifecycle facts but cannot view raw upstream payloads.
      </p>
    </div>
  );
}
