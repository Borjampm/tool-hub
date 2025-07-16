

interface TimerDisplayProps {
  elapsedTime: number; // in seconds
}

export function TimerDisplay({ elapsedTime }: TimerDisplayProps) {
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-center">
      <div className="text-6xl font-mono font-bold text-gray-900 mb-4">
        {formatTime(elapsedTime)}
      </div>
      <div className="text-sm text-gray-500">
        {elapsedTime === 0 ? 'Ready to start' : 'Time elapsed'}
      </div>
    </div>
  );
} 