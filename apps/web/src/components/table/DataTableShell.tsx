import type { ReactNode } from "react";

import type { PageInfo } from "@kalshi-quant-dashboard/contracts";

export function DataTableShell(props: {
  readonly title?: string;
  readonly summary?: string;
  readonly pageInfo?: PageInfo;
  readonly onPreviousPage?: () => void;
  readonly onNextPage?: () => void;
  readonly children: ReactNode;
}) {
  return (
    <section className="table-stack">
      {props.title || props.summary ? (
        <div className="table-shell-header">
          <div>
            {props.title ? <h3 className="table-title">{props.title}</h3> : null}
            {props.summary ? <p className="muted">{props.summary}</p> : null}
          </div>
          {props.pageInfo ? (
            <span className="muted">
              {props.pageInfo.totalItems} rows · page {props.pageInfo.page} of{" "}
              {props.pageInfo.totalPages}
            </span>
          ) : null}
        </div>
      ) : null}
      {props.children}
      {props.pageInfo ? (
        <div className="page-nav">
          <button
            className="secondary-button"
            disabled={props.pageInfo.page <= 1}
            onClick={props.onPreviousPage}
            type="button"
          >
            Previous
          </button>
          <span className="muted">
            Page {props.pageInfo.page} of {props.pageInfo.totalPages}
          </span>
          <button
            className="secondary-button"
            disabled={props.pageInfo.page >= props.pageInfo.totalPages}
            onClick={props.onNextPage}
            type="button"
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
