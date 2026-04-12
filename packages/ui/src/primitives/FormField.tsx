import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId
} from "react";

export function FormField(props: {
  readonly label: string;
  readonly htmlFor: string;
  readonly hint?: string;
  readonly error?: string;
  readonly children: ReactElement;
}) {
  const hintId = useId();
  const errorId = useId();
  const describedBy = [props.hint ? hintId : null, props.error ? errorId : null]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  const fieldChild = isValidElement(props.children)
    ? cloneElement(props.children, {
        id: props.htmlFor,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": props.error ? true : undefined
      } as Record<string, ReactNode>)
    : props.children;

  return (
    <label className="field" htmlFor={props.htmlFor}>
      <span>{props.label}</span>
      {fieldChild}
      {props.hint ? (
        <span className="field-hint" id={hintId}>
          {props.hint}
        </span>
      ) : null}
      {props.error ? (
        <span className="field-error" id={errorId} role="alert">
          {props.error}
        </span>
      ) : null}
    </label>
  );
}
