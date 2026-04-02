import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import NotFound from '../NotFound';

describe('NotFound page', () => {
  it('renders 404 message', () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <NotFound />
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('has links to home and contact', () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <NotFound />
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(screen.getByText('Go Home')).toBeInTheDocument();
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });
});
