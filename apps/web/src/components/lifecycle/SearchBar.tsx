import { useEffect, useState } from "react";

interface SearchBarProps {
  readonly resource: "decisions" | "trades" | "skips" | "alerts";
  readonly search: string;
  readonly sort: "newest" | "oldest";
  readonly canExport: boolean;
  readonly exportHref: string;
  readonly onSearchChange: (value: string) => void;
  readonly onSortChange: (value: "newest" | "oldest") => void;
}

export function SearchBar(props: SearchBarProps) {
  const [value, setValue] = useState(props.search);

  useEffect(() => {
    setValue(props.search);
  }, [props.search]);

  return (
    <div className="toolbar-row">
      <div className="toolbar-filters">
        <div className="field">
          <label htmlFor={`${props.resource}-search`}>Search</label>
          <input
            id={`${props.resource}-search`}
            className="search-bar"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                props.onSearchChange(value);
              }
            }}
            placeholder="Correlation, order, alias, ticker"
            value={value}
          />
        </div>
        <div className="field">
          <label htmlFor={`${props.resource}-sort`}>Sort</label>
          <select
            id={`${props.resource}-sort`}
            onChange={(event) =>
              props.onSortChange(event.target.value === "oldest" ? "oldest" : "newest")
            }
            value={props.sort}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>
      <div className="toolbar-actions">
        <button
          className="secondary-button"
          onClick={() => props.onSearchChange(value)}
          type="button"
        >
          Apply search
        </button>
        {props.canExport ? (
          <a className="secondary-button" href={props.exportHref}>
            Export CSV
          </a>
        ) : null}
      </div>
    </div>
  );
}
