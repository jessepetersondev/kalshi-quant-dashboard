import { type CSSProperties, type ReactNode, useMemo, useState } from "react";

interface VirtualizedColumn<Row> {
  readonly key: string;
  readonly header: ReactNode;
  readonly width?: CSSProperties["width"];
  readonly renderCell: (row: Row) => ReactNode;
}

export function VirtualizedDataTable<Row>(props: {
  readonly ariaLabel: string;
  readonly caption?: string;
  readonly columns: readonly VirtualizedColumn<Row>[];
  readonly rows: readonly Row[];
  readonly rowKey: (row: Row) => string;
  readonly rowHeight?: number;
  readonly maxHeight?: number;
  readonly overscan?: number;
}) {
  const rowHeight = props.rowHeight ?? 64;
  const overscan = props.overscan ?? 4;
  const viewportHeight = Math.min(
    props.maxHeight ?? 420,
    Math.max(rowHeight * Math.min(props.rows.length, 6) + 52, 180)
  );
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const last = Math.min(props.rows.length, first + visibleCount);
    return {
      first,
      last,
      topSpacerHeight: first * rowHeight,
      bottomSpacerHeight: Math.max(0, (props.rows.length - last) * rowHeight)
    };
  }, [overscan, props.rows.length, rowHeight, scrollTop, viewportHeight]);

  const visibleRows = props.rows.slice(visibleRange.first, visibleRange.last);

  return (
    <div
      className="virtual-table-shell"
      onScroll={(event) => {
        setScrollTop(event.currentTarget.scrollTop);
      }}
      style={{ maxHeight: viewportHeight }}
    >
      <table aria-label={props.ariaLabel} className="data-table">
        {props.caption ? <caption className="sr-only">{props.caption}</caption> : null}
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column.key} scope="col" style={{ width: column.width }}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRange.topSpacerHeight > 0 ? (
            <tr aria-hidden="true" className="virtual-spacer-row">
              <td colSpan={props.columns.length} style={{ height: visibleRange.topSpacerHeight }} />
            </tr>
          ) : null}
          {visibleRows.map((row) => (
            <tr key={props.rowKey(row)} style={{ height: rowHeight }}>
              {props.columns.map((column) => (
                <td key={column.key}>{column.renderCell(row)}</td>
              ))}
            </tr>
          ))}
          {visibleRange.bottomSpacerHeight > 0 ? (
            <tr aria-hidden="true" className="virtual-spacer-row">
              <td
                colSpan={props.columns.length}
                style={{ height: visibleRange.bottomSpacerHeight }}
              />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
