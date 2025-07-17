import React from 'react';

interface ComingSoonProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function ComingSoon({ 
  title = "Contáctanos", 
  description = "Esta página estará disponible pronto. ¡Gracias por tu interés!",
  className = ""
}: ComingSoonProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-gray-500">{description}</p>
      </div>
    </div>
  );
} 