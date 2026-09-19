export function safeReturnPath(value?: string) {
  return value && /^\/(?:feed|inbox(?:\/[a-f0-9-]{36})?|account\/profiel|bericht\/[a-f0-9-]{36}|organisaties(?:\/[a-z0-9][a-z0-9-]{2,49}(?:\/groep)?)?)$/.test(value) ? value : "/feed";
}
