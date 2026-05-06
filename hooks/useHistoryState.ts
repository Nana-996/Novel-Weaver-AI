import { useState, useCallback } from 'react';

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const useHistoryState = <T>(initialState: T) => {
  const [state, setReactState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;
  
  /**
   * Sets a new state.
   * @param newState The new state or a function to update the state.
   * @param initial - If true, resets the history. Used for loading initial data.
   * @param softUpdate - If true, updates only the 'present' state without adding to history.
   */
  const set = useCallback((newState: T | ((prevState: T) => T), initial = false, softUpdate = false) => {
    setReactState(currentState => {
      const newPresent = newState instanceof Function ? newState(currentState.present) : newState;
      
      // If the state is identical, do nothing.
      if (!initial && JSON.stringify(newPresent) === JSON.stringify(currentState.present)) {
        return currentState;
      }
      
      if (initial) {
          return { past: [], present: newPresent, future: [] };
      }
      
      if (softUpdate) {
          return { ...currentState, present: newPresent };
      }

      return {
        past: [...currentState.past, currentState.present],
        present: newPresent,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (!canUndo) return;
    setReactState(currentState => {
      const newPresent = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      return {
        past: newPast,
        present: newPresent,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setReactState(currentState => {
      const newPresent = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return {
        past: [...currentState.past, currentState.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, [canRedo]);

  return {
    state: state.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};