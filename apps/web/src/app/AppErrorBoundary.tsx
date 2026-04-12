import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

export class AppErrorBoundary extends Component<
  { readonly children?: ReactNode },
  { readonly error: Error | null }
> {
  constructor(props: { readonly children?: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="error-shell">
          <section className="error-card">
            <p className="eyebrow">Unhandled Error</p>
            <h1>Route rendering failed</h1>
            <p className="muted">{this.state.error.message}</p>
          </section>
        </main>
      );
    }

    return this.props.children ?? null;
  }
}
