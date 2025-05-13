// Enhanced InvitationCodeDisplay Component
import React, { useState } from "react";
import { Copy, CheckCircle, Loader } from "lucide-react";

const InvitationCodeDisplay = ({ invitation_code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (invitation_code) {
      navigator.clipboard.writeText(invitation_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle loading/empty state
  if (!invitation_code) {
    console.log("Loading or no invitation code available", invitation_code);
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <h3 className="font-medium text-gray-700 mb-2">Seu Código de Convite</h3>
        <div className="flex items-center">
          <div className="h-10 animate-pulse bg-gray-200 rounded w-24"></div>
          <Loader className="ml-3 h-5 w-5 text-gray-400 animate-spin" />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Carregando seu código de convite...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
      <h3 className="font-medium text-blue-800 mb-2">Seu Código de Convite</h3>
      <div className="flex items-center">
        <div className="text-2xl font-bold text-blue-700 bg-blue-100 px-3 py-2 rounded border border-blue-300">
          {invitation_code}
        </div>
        <button
          onClick={handleCopy}
          className="ml-3 p-2 rounded-md hover:bg-blue-200 transition-colors"
          title="Copiar código"
        >
          {copied ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <Copy className="h-5 w-5 text-blue-600" />
          )}
        </button>
      </div>
      <p className="text-sm text-blue-700 mt-2">
        Compartilhe este código com o administrador da sua organização para ser adicionado como membro.
      </p>
    </div>
  );
};

export default InvitationCodeDisplay;