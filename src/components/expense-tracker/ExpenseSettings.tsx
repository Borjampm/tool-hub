export function ExpenseSettings() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
          <p className="text-gray-600 mb-4">
            Customize your expense tracking preferences and categories.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Coming Soon:</h3>
            <ul className="text-gray-600 space-y-1 text-sm">
              <li>• Custom expense categories</li>
              <li>• Budget limits and alerts</li>
              <li>• Currency and locale settings</li>
              <li>• Data export preferences</li>
              <li>• Account and privacy settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 