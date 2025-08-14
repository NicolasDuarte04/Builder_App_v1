"use client";

// Soft console.error interception: log and optionally throw (disabled by default)
const SHOULD_THROW_ON_CONSOLE_ERROR = false;

const originalConsoleError = console.error.bind(console);

console.error = (...args: any[]) => {
  try {
    originalConsoleError(...args);
  } catch {
    // If console fails (very rare), swallow to avoid UI crashes
  }

  if (SHOULD_THROW_ON_CONSOLE_ERROR) {
    // Intentionally disabled to avoid breaking the chat/UI on benign errors
    // throw new Error(args?.[0]?.toString?.() || 'Console error intercepted');
  }
};

export {}; // side-effect module


