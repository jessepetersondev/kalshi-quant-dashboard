import type { CSSProperties, ReactNode } from "react";

import { Dialog } from "./primitives/Dialog.js";

const tones: Record<string, CSSProperties> = {
  teal: {
    background: "rgba(18, 44, 53, 0.9)",
    borderColor: "rgba(80, 175, 182, 0.3)"
  },
  blue: {
    background: "rgba(18, 32, 52, 0.9)",
    borderColor: "rgba(91, 141, 201, 0.3)"
  },
  amber: {
    background: "rgba(47, 35, 12, 0.9)",
    borderColor: "rgba(207, 164, 81, 0.28)"
  },
  red: {
    background: "rgba(49, 18, 18, 0.9)",
    borderColor: "rgba(194, 94, 94, 0.28)"
  },
  operator: {
    background: "rgba(28, 49, 61, 0.9)",
    borderColor: "rgba(88, 168, 180, 0.32)"
  },
  developer: {
    background: "rgba(28, 38, 64, 0.9)",
    borderColor: "rgba(88, 118, 190, 0.32)"
  },
  admin: {
    background: "rgba(61, 34, 61, 0.9)",
    borderColor: "rgba(184, 95, 184, 0.32)"
  },
  neutral: {
    background: "rgba(12, 24, 34, 0.92)",
    borderColor: "rgba(120, 153, 176, 0.18)"
  }
};

export function Card(props: {
  readonly title?: string;
  readonly accent?: keyof typeof tones;
  readonly children: ReactNode;
}) {
  const tone = tones[props.accent ?? "neutral"];

  return (
    <section
      style={{
        border: "1px solid rgba(120, 153, 176, 0.18)",
        borderRadius: "1.1rem",
        padding: "1rem",
        minWidth: 0,
        ...tone
      }}
    >
      {props.title ? (
        <header style={{ marginBottom: "0.9rem" }}>
          <strong>{props.title}</strong>
        </header>
      ) : null}
      {props.children}
    </section>
  );
}

export function Pill(props: { readonly tone?: keyof typeof tones; readonly children: ReactNode }) {
  const tone = tones[props.tone ?? "neutral"];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.3rem 0.65rem",
        borderRadius: "999px",
        border: "1px solid rgba(120, 153, 176, 0.18)",
        fontSize: "0.82rem",
        ...tone
      }}
    >
      {props.children}
    </span>
  );
}

export function Drawer(props: {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  if (!props.open) {
    return null;
  }

  return (
    <Dialog onClose={props.onClose} open={props.open} title={props.title}>
      <aside aria-label={props.title} className="drawer-panel">
        <div className="drawer-actions">
          <h3 style={{ margin: 0 }}>{props.title}</h3>
          <button className="secondary-button" onClick={props.onClose} type="button">
            Close
          </button>
        </div>
        <div style={{ marginTop: "1rem" }}>{props.children}</div>
      </aside>
    </Dialog>
  );
}
