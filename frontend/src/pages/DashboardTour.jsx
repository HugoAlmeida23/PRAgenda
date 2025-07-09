import React, { useState, useEffect, useRef } from 'react';
import Joyride, { STATUS } from 'react-joyride';

const steps = [
  {
    target: '.ai-insights-panel',
    content: 'Aqui tens insights inteligentes sobre a tua produtividade e alertas importantes!',
    disableBeacon: true,
    placement: 'bottom-start',
    spotlightPadding: 4,
  },
  {
    target: '.quick-actions-grid',
    content: 'Ações rápidas para registar tempo, criar tarefas e mais.',
    placement: 'bottom-start',
    spotlightPadding: 4,
  },
  {
    target: '.stat-card-tempo-hoje',
    content: 'Vê rapidamente quanto tempo registaste hoje.',
    placement: 'top',
    spotlightPadding: 2,
  },
  {
    target: '.stat-card-tarefas-ativas',
    content: 'Aqui podes ver o número de tarefas ativas.',
    placement: 'top',
    spotlightPadding: 2,
  },
  {
    target: '.my-day-section',
    content: 'O teu foco do dia: próximas tarefas e tempo registado recentemente.',
    placement: 'top-start',
    spotlightPadding: 6,
  },
];

export default function DashboardTour({ onClose }) {
  const [run, setRun] = useState(false);
  const joyrideHelpers = useRef(null); // Ref to store the joyride helpers

  // Effect to start the tour shortly after the component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setRun(true);
    }, 100); // Small delay to ensure it's mounted
    
    return () => clearTimeout(timer);
  }, []);

  // THE DEFINITIVE FIX:
  // This effect watches the `run` state. When it becomes `true`,
  // we wait a moment and then force Joyride to re-calculate everything.
  useEffect(() => {
    if (run && joyrideHelpers.current) {
      const resetTimer = setTimeout(() => {
        // This tells Joyride to re-measure all target elements.
        joyrideHelpers.current.reset(true);
        console.log('Forcing Joyride to reset and re-measure positions.');
      }, 100); // A 100ms delay is enough for the browser to paint.

      return () => clearTimeout(resetTimer);
    }
  }, [run]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      if (onClose) onClose();
    }
  };

  return (
    <Joyride
      // This prop gives us access to the internal helper functions
      getHelpers={(helpers) => {
        joyrideHelpers.current = helpers;
      }}
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      callback={handleJoyrideCallback}
      disableScrolling={true}
      scrollToFirstStep={true}
      styles={{
        options: {
          zIndex: 999999,
          primaryColor: '#9333ea',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        spotlight: {
          backgroundColor: 'transparent',
          border: '3px solid #9333ea',
          borderRadius: '12px',
          boxShadow: 'none',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '16px',
        },
        buttonNext: {
          backgroundColor: '#9333ea',
          borderRadius: '6px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: 'auto',
        },
        buttonSkip: {
          color: '#6b7280',
        },
      }}
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Terminar',
        next: 'Próximo',
        skip: 'Saltar',
      }}
    />
  );
}