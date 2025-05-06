import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDatabase } from '../hooks/useDatabase';
import { QuickHandicapEditor } from '../components/setup/QuickHandicapEditor';
import { Player } from '../store/gameStore';

// Mock the useDatabase hook
vi.mock('../hooks/useDatabase', () => ({
  useDatabase: vi.fn(),
}));

describe('Player Preferences', () => {
  describe('QuickHandicapEditor', () => {
    const mockPlayer: Player = {
      id: 'test-123',
      name: 'Test Player',
      index: 9.5,
      ghin: '1234567',
      notes: 'Test notes',
    };
    
    const mockSave = vi.fn();
    const mockCancel = vi.fn();
    
    beforeEach(() => {
      mockSave.mockClear();
      mockCancel.mockClear();
    });
    
    it('renders correctly with player data', () => {
      render(
        <QuickHandicapEditor 
          player={mockPlayer} 
          onSave={mockSave} 
          onCancel={mockCancel} 
        />
      );
      
      expect(screen.getByText(/Edit Player: Test Player/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Handicap Index/i)).toHaveValue('9.5');
      expect(screen.getByLabelText(/GHIN Number/i)).toHaveValue('1234567');
      expect(screen.getByLabelText(/Notes/i)).toHaveValue('Test notes');
    });
    
    it('validates handicap index input', async () => {
      render(
        <QuickHandicapEditor 
          player={mockPlayer} 
          onSave={mockSave} 
          onCancel={mockCancel} 
        />
      );
      
      const indexInput = screen.getByLabelText(/Handicap Index/i);
      
      // Test invalid input
      fireEvent.change(indexInput, { target: { value: 'abc' } });
      expect(screen.getByText(/Index must be a number/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
      
      // Test out of range
      fireEvent.change(indexInput, { target: { value: '40' } });
      expect(screen.getByText(/Index must be a number between 0 and 36/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
      
      // Test valid input
      fireEvent.change(indexInput, { target: { value: '12.5' } });
      expect(screen.queryByText(/Index must be a number/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save/i })).not.toBeDisabled();
    });
    
    it('calls onSave with updated player data', async () => {
      render(
        <QuickHandicapEditor 
          player={mockPlayer} 
          onSave={mockSave} 
          onCancel={mockCancel} 
        />
      );
      
      // Update values
      fireEvent.change(screen.getByLabelText(/Handicap Index/i), { target: { value: '10.5' } });
      fireEvent.change(screen.getByLabelText(/GHIN Number/i), { target: { value: '7654321' } });
      fireEvent.change(screen.getByLabelText(/Notes/i), { target: { value: 'Updated notes' } });
      
      // Click save
      fireEvent.click(screen.getByRole('button', { name: /Save/i }));
      
      // Check that onSave was called with updated data
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledWith({
        ...mockPlayer,
        index: 10.5,
        ghin: '7654321',
        notes: 'Updated notes',
        lastUsed: expect.any(String),
      });
    });
    
    it('calls onCancel when cancel button is clicked', () => {
      render(
        <QuickHandicapEditor 
          player={mockPlayer} 
          onSave={mockSave} 
          onCancel={mockCancel} 
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(mockCancel).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Player Persistence', () => {
    const mockPlayers: Player[] = [
      { id: 'p1', name: 'Alice', index: 8.4 },
      { id: 'p2', name: 'Bob', index: 6.1 },
      { id: 'p3', name: 'Carol', index: 10.2 },
    ];
    
    const mockUpdatePlayer = vi.fn();
    
    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        clear: vi.fn(),
        removeItem: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true
      });
      
      // Mock useDatabase return value
      (useDatabase as any).mockReturnValue({
        players: mockPlayers,
        isLoading: false,
        createPlayer: vi.fn(),
        updatePlayer: mockUpdatePlayer,
      });
    });
    
    // Additional player persistence tests can be added here
  });
}); 