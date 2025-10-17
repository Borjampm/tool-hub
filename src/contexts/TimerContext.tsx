import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { TimeEntryService } from '../services/timeEntryService';

interface TimerState {
  isRunning: boolean;
  elapsedTime: number; // in seconds
  startTime: number | null;
  entryId: string | null;
}

type TimerAction =
  | { type: 'START'; entryId: string; startTimeMs?: number }
  | { type: 'STOP' }
  | { type: 'TICK' }
  | { type: 'RESET' };

interface TimerContextType {
  state: TimerState;
  startTimer: (entryId: string, startTimeMs?: number) => void;
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
        startTime: action.startTimeMs ?? Date.now(),
        entryId: action.entryId,
        elapsedTime: action.startTimeMs ? Math.floor((Date.now() - action.startTimeMs) / 1000) : 0,
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

const STORAGE_KEY = 'hobby_timer_state';

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    timerReducer,
    initialState,
    (init) => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as TimerState;
          // Ensure sane values
          return {
            isRunning: !!parsed.isRunning,
            elapsedTime: typeof parsed.elapsedTime === 'number' ? parsed.elapsedTime : 0,
            startTime: typeof parsed.startTime === 'number' ? parsed.startTime : null,
            entryId: parsed.entryId ?? null,
          } as TimerState;
        }
      } catch (_e) {
        console.error('Error loading timer state:', _e);
      }
      return init;
    }
  );

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

  // Persist state to localStorage to avoid reset flicker on navigation
  useEffect(() => {
    try {
      if (!state.isRunning && state.entryId === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (_e) {
      console.error('Error persisting timer state:', _e);
    }
  }, [state]);

  // Resume any in-progress entry on provider mount
  useEffect(() => {
    (async () => {
      try {
        if (state.isRunning) return;
        const inProgress = await TimeEntryService.getInProgressEntry();
        if (inProgress && inProgress.start_time) {
          dispatch({ type: 'START', entryId: inProgress.entry_id, startTimeMs: new Date(inProgress.start_time).getTime() });
        }
      } catch (err) {
        // Non-fatal; ignore resume errors
        console.error('Timer resume failed:', err);
      }
    })();
  }, []);

  const startTimer = (entryId: string, startTimeMs?: number) => {
    dispatch({ type: 'START', entryId, startTimeMs });
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