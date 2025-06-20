// src/styles/themes.js

export const lightTheme = {
  body: 'rgb(243, 244, 246)',
  text: 'rgb(17, 24, 39)',
  textMuted: 'rgb(107, 114, 128)',
  textHighlight: 'rgb(59, 130, 246)',
  glassBg: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassHeader: 'rgba(249, 250, 251, 0.85)',
  headerBorder: 'rgba(0, 0, 0, 0.1)',
  input: {
    bg: 'rgba(0, 0, 0, 0.03)',
    border: 'rgba(0, 0, 0, 0.1)',
    placeholder: 'rgb(107, 114, 128)',
  },
  table: {
    headerBg: 'rgba(0, 0, 0, 0.05)',
    rowHoverBg: 'rgba(0, 0, 0, 0.04)',
    rowBorder: 'rgba(0, 0, 0, 0.07)',
  },
  button: {
    primaryBg: 'rgba(59, 130, 246, 0.1)',
    primaryBorder: 'rgba(59, 130, 246, 0.3)',
    primaryText: 'rgb(59, 130, 246)',
    secondaryBg: 'rgba(0, 0, 0, 0.03)',
    secondaryBorder: 'rgba(0, 0, 0, 0.1)',
    secondaryText: '#374151',
  },
  statCard: {
    total: { bg: '#E0E7FF', text: '#4338CA' },
    active: { bg: '#D1FAE5', text: '#047857' },
    inactive: { bg: '#FEE2E2', text: '#B91C1C' },
    revenue: { bg: '#F3E8FF', text: '#7E22CE' },
    label: '#4B5563',
  },
  aiInsights: {
    bg: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(0, 0, 0, 0.08)',
    headerText: '#1f2937',
    subHeaderText: '#4b5563',
    iconContainer: 'rgba(147, 51, 234, 0.1)',
    iconColor: '#7E22CE',
    insightCardBg: 'rgba(0, 0, 0, 0.03)',
    insightCardBorder: 'rgba(0, 0, 0, 0.07)',
    progressBarBg: 'rgba(0, 0, 0, 0.1)',
    actionButtonBg: 'rgba(0, 0, 0, 0.05)',
  },
  quickActions: {
    bg: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(0, 0, 0, 0.08)',
    headerText: '#1f2937',
    subHeaderText: '#4b5563',
    iconContainer: 'rgba(251, 191, 36, 0.15)',
    iconColor: '#D97706',
    actionCardBg: 'rgba(0, 0, 0, 0.04)',
    actionCardBorder: 'rgba(0, 0, 0, 0.08)',
    actionCardHoverBorder: 'rgba(0, 0, 0, 0.15)',
    actionLabel: '#111827',
    actionSublabel: '#4B5563',
  },
   task: {
    formBg: 'rgba(255, 255, 255, 0.9)',
    formHeaderBg: 'rgba(59, 130, 246, 0.05)',
    formSectionBg: 'rgba(0, 0, 0, 0.03)',
    status: {
        pending: '#D97706',
        in_progress: '#2563EB',
        completed: '#059669',
        cancelled: '#DC2626',
    },
    priority: {
        1: '#EF4444', // Urgente
        2: '#F59E0B', // Alta
        3: '#FBBF24', // Média
        4: '#3B82F6', // Baixa
        5: '#6B7280', // Pode Esperar
    }
  },
};

export const darkTheme = {
  body: 'rgb(15, 23, 42)',
  text: 'rgb(229, 231, 235)',
  textMuted: 'rgb(156, 163, 175)',
  textHighlight: 'rgb(96, 165, 250)',
  glassBg: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  glassHeader: 'rgba(17, 24, 39, 0.85)',
  headerBorder: 'rgba(255, 255, 255, 0.1)',
  input: {
    bg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
    placeholder: 'rgba(255, 255, 255, 0.5)',
  },
  table: {
    headerBg: 'rgba(255, 255, 255, 0.05)',
    rowHoverBg: 'rgba(255, 255, 255, 0.05)',
    rowBorder: 'rgba(255, 255, 255, 0.05)',
  },
  button: {
    primaryBg: 'rgba(59, 130, 246, 0.2)',
    primaryBorder: 'rgba(59, 130, 246, 0.3)',
    primaryText: 'white',
    secondaryBg: 'rgba(255, 255, 255, 0.1)',
    secondaryBorder: 'rgba(255, 255, 255, 0.2)',
    secondaryText: 'white',
  },
  statCard: {
    total: { bg: 'rgba(59, 130, 246, 0.1)', text: 'rgb(59, 130, 246)' },
    active: { bg: 'rgba(52, 211, 153, 0.1)', text: 'rgb(52, 211, 153)' },
    inactive: { bg: 'rgba(239, 68, 68, 0.1)', text: 'rgb(239, 68, 68)' },
    revenue: { bg: 'rgba(147, 51, 234, 0.1)', text: 'rgb(147, 51, 234)' },
    label: 'rgba(255, 255, 255, 0.8)',
  },
  aiInsights: {
    bg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.15)',
    headerText: '#FFFFFF',
    subHeaderText: 'rgb(191, 219, 254)',
    iconContainer: 'rgba(147, 51, 234, 0.2)',
    iconColor: '#c4b5fd',
    insightCardBg: 'rgba(255, 255, 255, 0.05)',
    insightCardBorder: 'rgba(255, 255, 255, 0.1)',
    progressBarBg: 'rgba(255, 255, 255, 0.1)',
    actionButtonBg: 'rgba(255, 255, 255, 0.1)',
  },
  quickActions: {
    bg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.15)',
    headerText: '#FFFFFF',
    subHeaderText: 'rgb(191, 219, 254)',
    iconContainer: 'rgba(251, 191, 36, 0.2)',
    iconColor: 'rgb(251, 191, 36)',
    actionCardBg: 'rgba(255, 255, 255, 0.1)',
    actionCardBorder: 'rgba(255, 255, 255, 0.1)',
    actionCardHoverBorder: 'rgba(255, 255, 255, 0.2)',
    actionLabel: '#FFFFFF',
    actionSublabel: 'rgb(191, 219, 254)',
  },
  task: {
    formBg: 'rgba(255, 255, 255, 0.1)',
    formHeaderBg: 'rgba(59, 130, 246, 0.2)',
    formSectionBg: 'rgba(59, 130, 246, 0.05)',
    status: {
        pending: 'rgb(251, 191, 36)',
        in_progress: 'rgb(59, 130, 246)',
        completed: 'rgb(52, 211, 153)',
        cancelled: 'rgb(239, 68, 68)',
    },
    priority: {
        1: 'rgb(239, 68, 68)',    // Urgente
        2: 'rgb(251, 146, 60)',   // Alta
        3: 'rgb(251, 191, 36)',   // Média
        4: 'rgb(59, 130, 246)',   // Baixa
        5: 'rgba(255, 255, 255, 0.6)', // Pode Esperar
    }
  },
};