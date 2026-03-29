import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg animate-pulse">
      <div className="flex justify-between items-center mb-3">
        <div className="h-6 w-2/4 bg-gray-700 rounded"></div>
        <div className="h-6 w-1/4 bg-gray-700 rounded"></div>
      </div>
      <div className="h-4 w-3/4 bg-gray-700 rounded mb-4"></div>
      <div className="flex justify-between text-sm">
        <div className="h-4 w-1/3 bg-gray-700 rounded"></div>
        <div className="h-4 w-1/3 bg-gray-700 rounded"></div>
      </div>
      <style jsx>{`
        .animate-pulse {
          background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SkeletonCard;
