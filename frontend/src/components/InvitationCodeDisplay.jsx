import React, { useState, useEffect, useRef } from "react";
import { Copy, CheckCircle } from "lucide-react";

const InvitationCodeDisplay = ({ invitation_code }) => {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeout = useRef(null);

  // Auto-hide tooltip after 3 seconds
  useEffect(() => {
    if (showTooltip) {
      tooltipTimeout.current = setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
    }
    
    return () => {
      if (tooltipTimeout.current) {
        clearTimeout(tooltipTimeout.current);
      }
    };
  }, [showTooltip]);

  const handleCopy = (e) => {
    e.stopPropagation(); // Prevent triggering parent click events
    
    if (invitation_code) {
      navigator.clipboard.writeText(invitation_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      
      // Show tooltip when copied
      setShowTooltip(true);
    }
  };

  if (!invitation_code) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <div>
        <h3 className="text-center text-blue-700 font-medium text-sm mb-1">Seu Código</h3>
        <div 
          className="group cursor-pointer"
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <div className="w-16 h-16 flex items-center justify-center bg-white border-2 border-blue-400 rounded shadow-sm hover:shadow transition-all">
            <span className="text-xl font-bold text-blue-800">{invitation_code}</span>
          </div>
          
          {/* Copy button that appears on hover */}
          <div className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-full bg-white hover:bg-blue-50 shadow-md border border-blue-300"
              title="Copiar código"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Tooltip with explanation */}
      {showTooltip && (
        <div className="absolute mt-2 w-48 p-2 bg-white shadow-lg rounded border border-blue-200 text-xs text-gray-700 z-10 left-1/2 transform -translate-x-1/2">
          {copied ? (
            <span className="text-green-600 font-medium">Código copiado!</span>
          ) : (
            <span>Compartilhe este código com o administrador da sua organização.</span>
          )}
        </div>
      )}
    </div>
  );
};

export default InvitationCodeDisplay;