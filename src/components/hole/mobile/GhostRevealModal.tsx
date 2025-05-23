import React, { useEffect, useState } from 'react';
import { Player } from '../../../db/API-GameState';
import { JunkFlags } from '../../../store/gameStore';
import { generateGhostNarrative } from '../../../utils/ghostNarrative';

interface GhostRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  grossScore: number;
  par: number;
  hole: number;
  junkFlags?: JunkFlags;
  yardage?: number;
}

export const GhostRevealModal: React.FC<GhostRevealModalProps> = ({
  isOpen,
  onClose,
  player,
  grossScore,
  par,
  hole,
  junkFlags,
  yardage
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Show content after backdrop animation
      setTimeout(() => setShowContent(true), 100);
    } else {
      setShowContent(false);
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const narrative = generateGhostNarrative({
    player,
    grossScore,
    par,
    hole,
    junkFlags,
    yardage
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="ghost-reveal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `rgba(0, 0, 0, ${isAnimating ? 0.7 : 0})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        transition: 'background-color 0.3s ease',
        padding: '20px'
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="ghost-reveal-modal"
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          transform: showContent ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
          opacity: showContent ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          textAlign: 'center',
          border: '3px solid',
          borderImage: 'linear-gradient(45deg, #8B5CF6, #06B6D4) 1'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ghost Icon with Animation */}
        <div
          style={{
            fontSize: '48px',
            marginBottom: '16px',
            animation: showContent ? 'ghost-float 2s ease-in-out infinite' : 'none'
          }}
        >
          👻
        </div>

        {/* Title */}
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: '24px',
            fontWeight: 700,
            background: 'linear-gradient(45deg, #8B5CF6, #06B6D4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Ghost Score Revealed!
        </h3>

        {/* Score Display */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            border: '2px solid #e2e8f0'
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#1a202c',
              marginBottom: '8px'
            }}
          >
            {grossScore}
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#64748b',
              fontWeight: 500
            }}
          >
            Hole {hole} • Par {par}
          </div>
        </div>

        {/* Narrative */}
        <div
          style={{
            fontSize: '16px',
            lineHeight: '1.5',
            color: '#374151',
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            borderLeft: '4px solid #8B5CF6'
          }}
        >
          {narrative}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            background: 'linear-gradient(45deg, #8B5CF6, #06B6D4)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 92, 246, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Continue Playing
        </button>
      </div>

      {/* CSS Animation Styles */}
      <style>
        {`
          @keyframes ghost-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </div>
  );
}; 