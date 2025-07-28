import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';

interface TimerState {
  isRunning: boolean;
  elapsedTime: number; // in seconds
  startTime: number | null;
  entryId: string | null;
}

type TimerAction =
  | { type: 'START'; entryId: string }
  | { type: 'STOP' }
  | { type: 'TICK' }
  | { type: 'RESET' };

interface TimerContextType {
  state: TimerState;
  startTimer: (entryId: string) => void;
  stopTimer: () => void;
  resetTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const initialState: TimerState = {
  isRunning: false,
  elapsedTime: 0,
  startTime: null,
  entryId: null,
};

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        isRunning: true,
        startTime: Date.now(),
        entryId: action.entryId,
      };
    case 'STOP':
      return {
        ...state,
        isRunning: false,
      };
    case 'TICK':
      if (!state.isRunning || !state.startTime) return state;
      return {
        ...state,
        elapsedTime: Math.floor((Date.now() - state.startTime) / 1000),
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(timerReducer, initialState);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (state.isRunning) {
      intervalId = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [state.isRunning]);

  const startTimer = (entryId: string) => {
    dispatch({ type: 'START', entryId });
  };

  const stopTimer = () => {
    dispatch({ type: 'STOP' });
  };

  const resetTimer = () => {
    dispatch({ type: 'RESET' });
  };

  return (
    <TimerContext.Provider value={{ state, startTimer, stopTimer, resetTimer }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
} 