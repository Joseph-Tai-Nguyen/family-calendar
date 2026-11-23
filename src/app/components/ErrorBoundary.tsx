import { Component, type ReactNode } from 'react';

/** Keeps one broken page from blanking the whole app; data in localStorage is untouched. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card">
        <h3>Something went wrong / Đã xảy ra lỗi</h3>
        <p className="muted small">{this.state.error.message}</p>
        <button className="btn" onClick={() => this.setState({ error: null })}>
          Retry
        </button>
      </div>
    );
  }
}
