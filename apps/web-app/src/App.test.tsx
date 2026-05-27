import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders starter heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /web-app ready/i })).toBeInTheDocument();
  });
});
