export function FeedControls(props: {
  readonly paused: boolean;
  readonly bufferedCount: number;
  readonly onToggle: () => void;
}) {
  return (
    <div className="toolbar-actions">
      <button className="secondary-button" onClick={props.onToggle} type="button">
        {props.paused ? "Resume live feed" : "Pause live feed"}
      </button>
      <span className="muted">Buffered updates: {props.bufferedCount}</span>
    </div>
  );
}
