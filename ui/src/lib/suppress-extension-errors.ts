/**
 * Suppresses known harmless errors from browser extensions and third-party scripts
 * that don't affect application functionality.
 */

const IGNORED_ERROR_PATTERNS = [
  // Ethereum wallet injection errors (browser extensions)
  /can't redefine non-configurable property "ethereum"/i,
  /can't redefine non-configurable property "solana"/i,
  
  // Third-party script errors
  /detectStore.*is undefined/i,
  /h1-check\.js/i,
  
  // Browser extension connection errors (harmless)
  /Could not establish connection\. Receiving end does not exist/i,
  /moz-extension:/i,
  /chrome-extension:/i,
  
  // SES lockdown warnings (harmless security framework messages)
  /SES.*Removing unpermitted intrinsics/i,
  /lockdown-install\.js/i,
];

const IGNORED_ERROR_SOURCES = [
  'moz-extension:',
  'chrome-extension:',
  'h1-check.js',
  'lockdown-install.js',
];

/**
 * Checks if an error should be suppressed based on its message or source
 */
function shouldSuppressError(error: Error | string, source?: string): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? '' : error.stack || '';
  const fullError = `${errorMessage} ${errorStack}`;

  // Check error message patterns
  if (IGNORED_ERROR_PATTERNS.some(pattern => pattern.test(fullError))) {
    return true;
  }

  // Check error source
  if (source && IGNORED_ERROR_SOURCES.some(ignored => source.includes(ignored))) {
    return true;
  }

  // Check stack trace for ignored sources
  if (IGNORED_ERROR_SOURCES.some(ignored => errorStack.includes(ignored))) {
    return true;
  }

  return false;
}

/**
 * Sets up global error handlers to suppress known harmless errors
 */
export function setupErrorSuppression() {
  // Suppress unhandled errors
  const originalErrorHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (shouldSuppressError(error || String(message), source)) {
      // Suppress the error - don't log it
      return true;
    }
    
    // Call original handler if it exists
    if (originalErrorHandler) {
      return originalErrorHandler.call(window, message, source, lineno, colno, error);
    }
    
    return false;
  };

  // Suppress unhandled promise rejections
  const originalUnhandledRejection = window.onunhandledrejection;
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || '';
    
    if (shouldSuppressError(errorMessage + ' ' + errorStack)) {
      event.preventDefault(); // Suppress the error
      return;
    }
    
    // Call original handler if it exists
    if (originalUnhandledRejection) {
      originalUnhandledRejection.call(window, event);
    }
  });

  // Note: We don't override console.error as it's too aggressive and might hide
  // legitimate errors. The window.onerror and unhandledrejection handlers are sufficient.
}
