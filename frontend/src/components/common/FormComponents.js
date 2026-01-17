import React from 'react';
import { Info, HelpCircle } from 'lucide-react';

export const FormField = ({ label, tooltip, children, error }) => (
  <div className="mb-4">
    <div className="flex items-center justify-between mb-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {tooltip && (
        <div className="group relative">
          <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
          <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            {tooltip}
          </div>
        </div>
      )}
    </div>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

export const Switch = ({ label, checked, onChange, description }) => (
  <div className="flex items-center justify-between py-4">
    <div className="flex flex-col">
      <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      {description && <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>}
    </div>
    <button
      type="button"
      className={`${
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`${
          checked ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  </div>
);

export const Input = ({ type = "text", ...props }) => (
  <input
    type={type}
    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400
    focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
    text-gray-900 dark:text-white"
    {...props}
  />
);

export const Select = ({ options, ...props }) => (
  <select
    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
    focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
    text-gray-900 dark:text-white"
    {...props}
  >
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);
