import React from 'react';

const ArchitecturePage = () => {
  const diagramMarkup = `
    graph TD
        A[Data Layer: NSE Data] --> B(Pattern Engine);
        B --> C{Backtester};
        C --> B;
        B --> D[LLM Layer: Gemini];
        D --> E[Dashboard];
        subgraph User Interface
            E
            F[Video Studio]
            G[AI Chat]
        end
        D --> F;
        D --> G;
    `;

  return (
    <div className="p-8 text-white bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold font-space-grotesk text-center mb-8">System Architecture</h1>
      <div className="flex justify-center">
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
          {/* In a real app, you'd use a library like mermaid.js to render this */}
          <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
            <code>
              {diagramMarkup}
            </code>
          </pre>
          <p className="text-center text-gray-400 mt-4 text-sm">This diagram shows the flow of data from the source to the user interface.</p>
        </div>
      </div>
    </div>
  );
};

export default ArchitecturePage;
