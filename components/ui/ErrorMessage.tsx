import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorMessage({
  title = 'Error',
  message,
  onRetry,
  className = '',
}: ErrorMessageProps) {
  return (
    <div
      className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-red-900 font-semibold mb-1">{title}</h3>
          <p className="text-red-700 text-sm">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
