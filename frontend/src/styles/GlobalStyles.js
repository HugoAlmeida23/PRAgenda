// src/styles/GlobalStyles.js
import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  body {
    background: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text};
    font-family: 'Inter', sans-serif;
    transition: all 0.25s linear;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Custom scrollbar for dark theme */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: ${({ theme }) => (theme.body === 'rgb(243, 244, 246)' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')};
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => (theme.body === 'rgb(243, 244, 246)' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)')};
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => (theme.body === 'rgb(243, 244, 246)' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)')};
  }

  select option {
     background: ${({ theme }) => (theme.body === 'rgb(243, 244, 246)' ? '#ffffff' : '#131722')} !important;
     color: ${({ theme }) => theme.text} !important;
  }
`;