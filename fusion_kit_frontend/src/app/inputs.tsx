import React, {
  useCallback, useEffect, useId, useState,
} from "react";

interface OptionalNumberInputProps {
  label: string,
  placeholder?: string,
  value: number | null,
  onChange: (_newValue: number | null) => void,
  allowDecimal?: boolean,
}

export const OptionalNumberInput: React.FC<OptionalNumberInputProps> = (props) => {
  const {
    label, placeholder, value, onChange, allowDecimal = false,
  } = props;

  const textInputId = useId();

  const [textValue, setTextValue] = useState(value != null ? value.toString() : "");

  useEffect(() => {
    setTextValue(value?.toString() ?? "");
  }, [value]);

  const onTextInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    const newStringValue = e.target.value;

    setTextValue(newStringValue);

    const newValue = Number(newStringValue);
    if (newStringValue !== "" && (allowDecimal || Number.isSafeInteger(newValue))) {
      onChange(newValue);
    } else {
      onChange(null);
    }
  }, [onChange, allowDecimal]);
  const onTextInputBlur: React.FocusEventHandler<HTMLInputElement> = useCallback(() => {
    setTextValue(value != null ? value.toString() : "");
  }, [value]);

  return (
    <>
      <label htmlFor={textInputId} className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        pattern={allowDecimal ? "[0-9\\.]*" : "[0-9]*"}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        id={textInputId}
        value={textValue}
        placeholder={placeholder}
        onChange={onTextInputChange}
        onBlur={onTextInputBlur}
      />
    </>
  );
};

interface NumberInputProps {
  label: string,
  placeholder?: string,
  value: number | null,
  onChange: (_newValue: number) => void,
  allowDecimal?: boolean,
}

export const NumberInput: React.FC<NumberInputProps> = (props) => {
  const {
    label, placeholder, value, onChange, allowDecimal,
  } = props;

  const onInputChange = useCallback((newValue: number | null) => {
    if (newValue != null) {
      onChange(newValue);
    }
  }, [onChange]);

  return (
    <OptionalNumberInput
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onInputChange}
      allowDecimal={allowDecimal}
    />
  );
};
