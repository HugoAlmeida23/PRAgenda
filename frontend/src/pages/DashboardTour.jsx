import React, { useState, useEffect, useRef } from 'react';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';

const steps = [
  {
    target: '.ai-insights-panel',
    content: 'Aqui tens insights inteligentes sobre a tua produtividade e alertas importantes!',
    disableBeacon: true,
    placement: 'bottom-start',
    spotlightPadding: 0, // ou 4, ou 8, conforme o que fica melhor
    offset: 0,           // offset só afeta o tooltip, não o spotlight
    placementBeacon: 'bottom',
  },
  {
    target: '.quick-actions-grid',
    content: 'Ações rápidas para registar tempo, criar tarefas e mais.',
    placement: 'bottom',
    spotlightPadding: 10,
    offset: 10,
  },
  {
    target: '.stat-card-tempo-hoje',
    content: 'Vê rapidamente quanto tempo registaste hoje.',
    placement: 'top',
    spotlightPadding: 8,
    offset: 10,
  },
  {
    target: '.stat-card-tarefas-ativas',
    content: 'Aqui podes ver o número de tarefas ativas.',
    placement: 'top',
    spotlightPadding: 8,
    offset: 10,
  },
  {
    target: '.my-day-section',
    content: 'O teu foco do dia: próximas tarefas e tempo registado recentemente.',
    placement: 'top',
    spotlightPadding: 10,
    offset: 10,
  },
];

export default function DashboardTour({ onClose }) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const joyrideRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const [elementsReady, setElementsReady] = useState(false);

  // Função para verificar se todos os elementos existem
  const checkElementsExist = () => {
    const targets = steps.map(step => step.target);
    const allExist = targets.every(target => {
      const element = document.querySelector(target);
      return element && element.offsetParent !== null; // Verifica se o elemento existe e está visível
    });
    return allExist;
  };

  // Função para aguardar que os elementos estejam prontos
  const waitForElements = () => {
    if (checkElementsExist()) {
      setElementsReady(true);
      return;
    }

    // Tenta novamente após um breve delay
    retryTimeoutRef.current = setTimeout(() => {
      waitForElements();
    }, 100);
  };

  // Effect para iniciar a verificação dos elementos
  useEffect(() => {
    waitForElements();
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Effect para iniciar o tour quando os elementos estão prontos
  useEffect(() => {
    if (elementsReady) {
      const timer = setTimeout(() => {
        setRun(true);
      }, 500); // Delay maior para garantir que tudo está renderizado
      
      return () => clearTimeout(timer);
    }
  }, [elementsReady]);

  // Effect para forçar recálculo quando o tour inicia
  useEffect(() => {
    if (run && joyrideRef.current) {
      const resetTimer = setTimeout(() => {
        // Força o Joyride a recalcular as posições
        if (joyrideRef.current && joyrideRef.current.helpers) {
          joyrideRef.current.helpers.reset(true);
          console.log('Joyride positions recalculated');
        }
      }, 200);

      return () => clearTimeout(resetTimer);
    }
  }, [run]);

  const handleJoyrideCallback = (data) => {
    const { status, type, index, action } = data;
    
    console.log('Joyride callback:', { status, type, index, action });
    
    if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
    
    if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn('Target not found:', steps[index]?.target);
      // Tenta encontrar o elemento novamente
      const targetElement = document.querySelector(steps[index]?.target);
      if (targetElement) {
        // Se o elemento existe, força um reset
        setTimeout(() => {
          if (joyrideRef.current && joyrideRef.current.helpers) {
            joyrideRef.current.helpers.reset(true);
          }
        }, 100);
      }
    }
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      setStepIndex(0);
      if (onClose) onClose();
    }
  };

  // Função para obter o ref do Joyride
  const getJoyrideRef = (ref) => {
    joyrideRef.current = ref;
  };

  // Se os elementos ainda não estão prontos, não renderiza o tour
  if (!elementsReady) {
    return null;
  }

  return (
    <Joyride
      ref={getJoyrideRef}
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      callback={handleJoyrideCallback}
      disableScrolling={false}
      scrollToFirstStep={true}
      scrollOffset={100}
      spotlightClicks={false}
      disableOverlayClose={true}
      styles={{
        options: {
          zIndex: 999999,
          primaryColor: '#9333ea',
          width: 350,
          arrowColor: '#ffffff',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        },
        spotlight: {
          backgroundColor: 'transparent',
          border: '3px solid #9333ea',
          borderRadius: '12px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          backgroundColor: '#ffffff',
          color: '#1f2937',
          fontSize: '14px',
          lineHeight: '1.5',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#1f2937',
        },
        tooltipContent: {
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#4b5563',
        },
        buttonNext: {
          backgroundColor: '#9333ea',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '500',
          border: 'none',
          color: 'white',
        },
        buttonBack: {
          color: '#6b7280',
          fontSize: '14px',
          fontWeight: '500',
          marginRight: 'auto',
          padding: '10px 16px',
          backgroundColor: 'transparent',
          border: 'none',
        },
        buttonSkip: {
          color: '#6b7280',
          fontSize: '14px',
          fontWeight: '500',
          padding: '10px 16px',
          backgroundColor: 'transparent',
          border: 'none',
        },
        buttonClose: {
          color: '#6b7280',
          fontSize: '14px',
          fontWeight: '500',
          padding: '10px 16px',
          backgroundColor: 'transparent',
          border: 'none',
        },
        arrow: {
          color: '#ffffff',
        },
        hole: {
          backgroundColor: 'transparent',
        },
      }}
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Terminar',
        next: 'Próximo',
        skip: 'Saltar',
      }}
      floaterProps={{
        disableAnimation: true,
        styles: {
          arrow: {
            spread: 10,
            length: 8,
          },
        },
      }}
    />
  );
}