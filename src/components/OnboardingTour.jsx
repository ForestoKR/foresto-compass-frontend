import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import '../styles/OnboardingTour.css';

const TOUR_COMPLETED_KEY = 'onboarding_tour_completed';

function OnboardingTour() {
  const navigate = useNavigate();

  const startTour = useCallback(() => {
    if (localStorage.getItem(TOUR_COMPLETED_KEY)) return;

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'foresto-tour-step',
        scrollTo: true,
        cancelIcon: { enabled: true },
      },
    });

    tour.addStep({
      id: 'step-learn',
      title: '\uD559\uC2B5',
      text: '\uC5EC\uAE30\uC11C \uC2DC\uC7A5\uD604\uD669, \uC885\uBAA9 \uC2A4\uD06C\uB9AC\uB108, \uAD00\uC2EC \uC885\uBAA9 \uB4F1\uC744 \uD0D0\uC0C9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
      attachTo: { element: '.nav-group:nth-child(1)', on: 'bottom' },
      buttons: [
        { text: '\uB2E4\uC74C', action: tour.next, classes: 'shepherd-button' },
      ],
    });

    tour.addStep({
      id: 'step-diagnosis',
      title: '\uC9C4\uB2E8',
      text: '\uD22C\uC790 \uC131\uD5A5 \uC9C4\uB2E8\uC744 \uD1B5\uD574 \uB098\uC5D0\uAC8C \uB9DE\uB294 \uC804\uB7B5\uC744 \uCC3E\uC544\uBCF4\uC138\uC694.',
      attachTo: { element: '.nav-group:nth-child(2)', on: 'bottom' },
      buttons: [
        { text: '\uC774\uC804', action: tour.back, classes: 'shepherd-button shepherd-button-secondary' },
        { text: '\uB2E4\uC74C', action: tour.next, classes: 'shepherd-button' },
      ],
    });

    tour.addStep({
      id: 'step-portfolio',
      title: '\uD3EC\uD2B8\uD3F4\uB9AC\uC624',
      text: '\uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uAD6C\uC131, \uBC31\uD14C\uC2A4\uD305, \uC2DC\uBBAC\uB808\uC774\uC158\uC744 \uCCB4\uD5D8\uD574\uBCF4\uC138\uC694.',
      attachTo: { element: '.nav-group:nth-child(3)', on: 'bottom' },
      buttons: [
        { text: '\uC774\uC804', action: tour.back, classes: 'shepherd-button shepherd-button-secondary' },
        { text: '\uB2E4\uC74C', action: tour.next, classes: 'shepherd-button' },
      ],
    });

    tour.addStep({
      id: 'step-theme',
      title: '\uD14C\uB9C8 \uC804\uD658',
      text: '\uB2E4\uD06C/\uB77C\uC774\uD2B8 \uBAA8\uB4DC\uB97C \uC804\uD658\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
      attachTo: { element: '.theme-toggle', on: 'bottom' },
      buttons: [
        { text: '\uC774\uC804', action: tour.back, classes: 'shepherd-button shepherd-button-secondary' },
        { text: '\uB2E4\uC74C', action: tour.next, classes: 'shepherd-button' },
      ],
    });

    tour.addStep({
      id: 'step-start',
      title: '\uC900\uBE44 \uC644\uB8CC!',
      text: '\uBA3C\uC800 \uD22C\uC790 \uC131\uD5A5 \uC9C4\uB2E8\uBD80\uD130 \uC2DC\uC791\uD574\uBCFC\uAE4C\uC694?',
      buttons: [
        { text: '\uB098\uC911\uC5D0', action: tour.complete, classes: 'shepherd-button shepherd-button-secondary' },
        {
          text: '\uC9C4\uB2E8 \uC2DC\uC791',
          action: () => {
            tour.complete();
            navigate('/survey');
          },
          classes: 'shepherd-button',
        },
      ],
    });

    tour.on('complete', () => localStorage.setItem(TOUR_COMPLETED_KEY, 'true'));
    tour.on('cancel', () => localStorage.setItem(TOUR_COMPLETED_KEY, 'true'));
    tour.start();
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(startTour, 800);
    return () => clearTimeout(timer);
  }, [startTour]);

  // Listen for manual tour restart from Header "시작 가이드"
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(TOUR_COMPLETED_KEY);
      startTour();
    };
    window.addEventListener('startOnboardingTour', handler);
    return () => window.removeEventListener('startOnboardingTour', handler);
  }, [startTour]);

  return null;
}

export default OnboardingTour;
