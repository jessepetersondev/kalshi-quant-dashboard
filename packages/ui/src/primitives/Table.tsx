import type { ReactNode } from "react";

export function TableContainer(props: {
  readonly ariaLabel: string;
  readonly caption?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="table-shell">
      <table aria-label={props.ariaLabel} className="data-table">
        {props.caption ? <caption className="sr-only">{props.caption}</caption> : null}
        {props.children}
      </table>
    </div>
  );
}

export function TableHeader(props: { readonly children: ReactNode }) {
  return <thead>{props.children}</thead>;
}

export function TableBody(props: { readonly children: ReactNode }) {
  return <tbody>{props.children}</tbody>;
}
