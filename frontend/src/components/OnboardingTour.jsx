import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, SkipForward } from 'lucide-react';

const OnboardingTour = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('tourCompleted');
    if (!tourCompleted) {
      setShowTour(true);
    }
  }, []);

  const steps = [
    {
      id: 1,
      title: "Today's Top Signals",
      description: "These are today's top signals — ranked by AI conviction score. Higher scores mean more reliable patterns.",
      position: { top: '200px', left: '50px', width: '400px' }
    },
    {
      id: 2,
      title: "Signal Details",
      description: "Click any card to see the full chart, historical win rate, and AI analysis for that stock.",
      position: { top: '250px', left: '100px', width: '350px' }
    },
    {
      id: 3,
      title: "Generate Market Video",
      description: "Generate a 60-second AI market update video with one click. Perfect for sharing insights!",
      position: { top: '300px', left: '800px', width: '300px' }
    },
    {
      id: 4,
      title: "Ask AI Assistant",
      description: "Ask our AI any question about any NSE stock. Get simple, clear answers instantly.",
      position: { top: '400px', right: '50px', width: '320px' }
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem('tourCompleted', 'true');
    setShowTour(false);
  };

  const skipTour = () => {
    localStorage.setItem('tourCompleted', 'true');
    setShowTour(false);
  };

  if (!showTour) return null;

  const currentStepData = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={skipTour} />
      
      {/* Tooltip */}
      <div
        className="fixed bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-6 shadow-2xl z-50 animate-slide-up"
        style={{
          ...currentStepData.position,
          maxWidth: '90vw'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {currentStepData.title}
            </h3>
            <p className="text-sm text-gray-300">
              {currentStepData.description}
            </p>
          </div>
          <button
            onClick={skipTour}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-colors ${
                index <= currentStep ? 'bg-[#00D4AA]' : 'bg-[#2a2a3e]'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-1 px-3 py-2 bg-[#2a2a3e] hover:bg-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              onClick={nextStep}
              className="flex items-center gap-1 px-4 py-2 bg-[#00D4AA] hover:bg-[#00B894] text-white rounded-lg transition-colors text-sm font-medium"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default OnboardingTour;
