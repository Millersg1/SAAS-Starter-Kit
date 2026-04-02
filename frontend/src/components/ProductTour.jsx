import { useState, useEffect, useRef } from 'react';

/**
 * Interactive product tour with step-by-step tooltips.
 * Shows helpful pointers to new users explaining key features.
 */

const TOUR_STEPS = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Navigation',
    content: 'Use the sidebar to navigate between all features — CRM, invoicing, projects, marketing, and more.',
    position: 'right',
  },
  {
    target: '[data-tour="search"]',
    title: 'Quick Search',
    content: 'Press Ctrl+K to search for anything — clients, projects, invoices, or navigate to any page instantly.',
    position: 'bottom',
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Real-time Notifications',
    content: 'Stay updated with real-time alerts for new messages, payments, tasks, and more.',
    position: 'bottom',
  },
  {
    target: '[data-tour="theme"]',
    title: 'Dark Mode',
    content: 'Toggle between light and dark modes for comfortable viewing.',
    position: 'bottom',
  },
];

const ProductTour = ({ onComplete }) => {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);

  // Check if user has completed the tour
  useEffect(() => {
    const completed = localStorage.getItem('product_tour_completed');
    const dismissed = localStorage.getItem('product_tour_dismissed');
    if (!completed && !dismissed) {
      // Delay start so page is rendered
      const timer = setTimeout(() => setActive(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Position tooltip near target element
  useEffect(() => {
    if (!active) return;
    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    const target = document.querySelector(step.target);
    if (!target) {
      // Skip to next step if target not found
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep(s => s + 1);
      } else {
        completeTour();
      }
      return;
    }

    const rect = target.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 150;
    const gap = 12;

    let top, left;
    switch (step.position) {
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
        break;
      case 'top':
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      default:
        top = rect.bottom + gap;
        left = rect.left;
    }

    // Keep within viewport
    top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));

    setPosition({ top, left });

    // Highlight target
    target.style.position = 'relative';
    target.style.zIndex = '101';
    target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.4)';
    target.style.borderRadius = '8px';

    return () => {
      target.style.zIndex = '';
      target.style.boxShadow = '';
      target.style.borderRadius = '';
    };
  }, [active, currentStep]);

  const completeTour = () => {
    localStorage.setItem('product_tour_completed', 'true');
    setActive(false);
    onComplete?.();
  };

  const dismissTour = () => {
    localStorage.setItem('product_tour_dismissed', 'true');
    setActive(false);
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  if (!active) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[99] bg-black/30" onClick={dismissTour} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[102] w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5"
        style={{ top: position.top, left: position.left }}
      >
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep ? 'bg-blue-500' : i < currentStep ? 'bg-blue-300' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
          {step.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {step.content}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={dismissTour}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Back
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <div className="mt-2 text-right">
          <span className="text-xs text-gray-400">
            {currentStep + 1} of {TOUR_STEPS.length}
          </span>
        </div>
      </div>
    </>
  );
};

export default ProductTour;
