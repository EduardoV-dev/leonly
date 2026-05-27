import { QueryProvider } from '@/providers/QueryProvider';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders auth heading and Google button', () => {
    render(
      <QueryProvider>
        <App />
      </QueryProvider>,
    );
    expect(screen.getByRole('heading', { name: /every moment with you\./i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });
});
