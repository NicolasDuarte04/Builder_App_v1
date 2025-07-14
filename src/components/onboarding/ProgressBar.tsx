'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="flex items-center space-x-3 relative w-36 md:w-48">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out absolute top-0 left-0"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-sm text-gray-600 min-w-fit">
        {currentStep}/{totalSteps}
      </div>
    </div>
  );
} 