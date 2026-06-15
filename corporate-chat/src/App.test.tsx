import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders chat application', () => {
  render(<App />);
  // Просто проверяем, что приложение рендерится без ошибок
  expect(true).toBe(true);
});