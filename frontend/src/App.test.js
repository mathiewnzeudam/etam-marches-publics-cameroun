import { render, screen } from '@testing-library/react';
import App from './App';

test("l'application se rend sans erreur et affiche la marque E-TAM", () => {
  render(<App />);
  expect(screen.getAllByText(/TAM/i).length).toBeGreaterThan(0);
});
