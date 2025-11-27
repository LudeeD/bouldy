import { useState, useEffect } from "react";

interface VariableFormProps {
  variables: string[];
  onValuesChange: (values: Record<string, string>) => void;
}

export default function VariableForm({ variables, onValuesChange }: VariableFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    variables.forEach((v) => {
      initial[v] = "";
    });
    setValues(initial);
  }, [variables]);

  const handleChange = (variable: string, value: string) => {
    const updated = { ...values, [variable]: value };
    setValues(updated);
    onValuesChange(updated);
  };

  if (variables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-text-muted font-medium">Variables</div>
      {variables.map((variable) => (
        <div key={variable} className="space-y-1">
          <label className="text-xs text-text-muted">{variable}</label>
          <textarea
            value={values[variable] || ""}
            onChange={(e) => handleChange(variable, e.target.value)}
            placeholder={`Enter value for {{${variable}}}`}
            className="w-full px-2 py-1.5 text-sm bg-bg border border-border-muted focus:outline-none focus:border-primary text-text placeholder:text-text-muted resize-none"
            rows={2}
          />
        </div>
      ))}
    </div>
  );
}
