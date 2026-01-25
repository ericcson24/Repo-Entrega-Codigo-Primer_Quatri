import React from 'react';
import { HelpCircle } from 'lucide-react';
import './FormComponents.css';

export const FormField = ({ label, tooltip, children, error }) => (
  <div className="form-field">
    <div className="form-field-header">
      <label className="form-label">
        {label}
      </label>
      {tooltip && (
        <div className="form-tooltip-container">
          <HelpCircle className="form-tooltip-icon" />
          <div className="form-tooltip-content">
            {tooltip}
          </div>
        </div>
      )}
    </div>
    {children}
    {error && <p className="form-error">{error}</p>}
  </div>
);

export const Switch = ({ label, checked, onChange, description }) => (
  <div className="switch-container">
    <div className="switch-label-container">
      <span className="switch-label">{label}</span>
      {description && <span className="switch-description">{description}</span>}
    </div>
    <button
      type="button"
      className={`switch-button ${checked ? 'switch-on' : 'switch-off'}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`switch-toggle ${checked ? 'toggle-on' : 'toggle-off'}`}
      />
    </button>
  </div>
);

export const Input = ({ type = "text", ...props }) => (
  <input
    type={type}
    className="form-input"
    {...props}
  />
);

export const Select = ({ options, ...props }) => (
  <select
    className="form-select"
    {...props}
  >
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);
