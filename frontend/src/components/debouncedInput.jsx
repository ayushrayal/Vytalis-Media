import React, { useState, useEffect } from 'react';

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounceTime = 300,
  ...props
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounceTime);

    return () => clearTimeout(timeout);
  }, [value, debounceTime, onChange]);

  return (
    <input
      {...props}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
};

export default DebouncedInput;
