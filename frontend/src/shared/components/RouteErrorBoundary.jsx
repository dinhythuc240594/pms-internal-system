import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import LohaErrorPage from './LohaErrorPage';

class ViewErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <LohaErrorPage status={500} fullPage onRetry={() => this.setState({ failed: false })} /> : this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ViewErrorBoundary key={pathname}>{children}</ViewErrorBoundary>;
}
