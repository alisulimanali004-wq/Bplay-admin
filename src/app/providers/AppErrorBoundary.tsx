import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './AppErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/** Catches render-time errors anywhere below and shows a safe, on-brand fallback. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.host}>
          <div>
            <p className={styles.title}>Something went wrong</p>
            <p className={styles.desc}>Please refresh the page.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
