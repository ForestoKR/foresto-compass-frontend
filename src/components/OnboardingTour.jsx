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
      id: 'step-explore',
      title: '① 시장 탐색',
      text: '시장현황, 종목 스크리너, 관심 종목 등을 탐색하는 첫 번째 단계입니다.',
      attachTo: { element: '.step-nav-group:nth-child(1) .step-button', on: 'bottom' },
      buttons: [
        { text: '다음', action: tour.next, classes: 'shepherd-button' },
      ],
    });

    tour.addStep({
      id: 'step-diagnosis',
      title: '② 투자성향 진단',
      text: '투자 성향 진단을 통해 나에게 맞는 전략을 찾아보세요. 건너뛰어도 됩니다.',
      attachTo: { element: '.step-nav-group:nth-child(2) .step-button', on: 'bottom' },
      buttons: [
        { text: '이전', action: tour.back, classes: 'shepherd-button shepherd-button-secondary' },
        { text: '다음', action: tour.next, classes: 'shepherd-button' },
      ],
    });

    tour.addStep({
      id: 'step-portfolio',
      title: '③ 포트폴리오 구성',
      text: 'AI 추천 또는 직접 구성으로 포트폴리오를 만들어보세요.',
      attachTo: { element: '.step-nav-group:nth-child(3) .step-button', on: 'bottom' },
      buttons: [
        { text: '이전', action: tour.back, classes: 'shepherd-button shepherd-button-secondary' },
        { text: '다음', action: tour.next, classes: 'shepherd-button' },
      ],
    });

    tour.addStep({
      id: 'step-simulation',
      title: '④ 시뮬레이션·검증',
      text: '백테스팅, 시나리오 분석, 성과해석으로 전략을 검증해보세요.',
      attachTo: { element: '.step-nav-group:nth-child(4) .step-button', on: 'bottom' },
      buttons: [
        { text: '이전', action: tour.back, classes: 'shepherd-button shepherd-button-secondary' },
        { text: '다음', action: tour.next, classes: 'shepherd-button' },
      ],
    });

    tour.addStep({
      id: 'step-theme',
      title: '테마 전환',
      text: '다크/라이트 모드를 전환할 수 있습니다.',
      attachTo: { element: '.theme-toggle', on: 'bottom' },
      buttons: [
        { text: '이전', action: tour.back, classes: 'shepherd-button shepherd-button-secondary' },
        { text: '다음', action: tour.next, classes: 'shepherd-button' },
      ],
    });

    tour.addStep({
      id: 'step-start',
      title: '준비 완료!',
      text: '먼저 투자 성향 진단부터 시작해볼까요?',
      buttons: [
        { text: '나중에', action: tour.complete, classes: 'shepherd-button shepherd-button-secondary' },
        {
          text: '진단 시작',
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
