import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef
} from "react";

export function Dialog(props: {
  readonly open: boolean;
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (props.open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      panelRef.current?.focus();
      return;
    }

    restoreFocusRef.current?.focus();
  }, [props.open]);

  useEffect(() => {
    if (!props.open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        props.onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [props.open, props.onClose]);

  if (!props.open) {
    return null;
  }

  function handleOverlayClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      props.onClose();
    }
  }

  function handlePanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      props.onClose();
    }
  }

  return (
    <div className="drawer-overlay" onMouseDown={handleOverlayClick}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="dialog-surface"
        onKeyDown={handlePanelKeyDown}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <span className="sr-only" id={titleId}>
          {props.title}
        </span>
        {props.children}
      </div>
    </div>
  );
}
