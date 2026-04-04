import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * WorkspaceErrorBoundary — wraps individual workspace drill views.
 * If a workspace component crashes, only that workspace shows the error,
 * not the entire app. The user can retry or navigate away.
 */
class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[WorkspaceErrorBoundary] ${this.props.workspace || 'unknown'} crashed:`, error, errorInfo);
  }

  // Reset when the workspace changes (user spins to a different space)
  componentDidUpdate(prevProps) {
    if (prevProps.workspace !== this.props.workspace && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <AlertTriangle className="h-10 w-10 text-primary mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            This space ran into a problem
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Something went wrong loading {this.props.workspace || 'this workspace'}.
            Try again or spin to a different space.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-5 py-2 rounded-lg transition-colors min-h-[44px]"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WorkspaceErrorBoundary;
