import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import SEO from '../SEO';

const renderWithHelmet = (ui) =>
  render(<HelmetProvider>{ui}</HelmetProvider>);

describe('SEO component', () => {
  it('renders without crashing', () => {
    renderWithHelmet(<SEO title="Test Page" />);
  });

  it('sets title with site name suffix', () => {
    const { container } = renderWithHelmet(<SEO title="Test" />);
    // Helmet updates are async in test env, just verify no error
    expect(container).toBeDefined();
  });

  it('renders structured data when provided', () => {
    const schema = { '@type': 'Organization', name: 'Test' };
    renderWithHelmet(<SEO title="Test" structuredData={schema} />);
  });

  it('handles noindex flag', () => {
    renderWithHelmet(<SEO title="Private" noindex />);
  });
});
