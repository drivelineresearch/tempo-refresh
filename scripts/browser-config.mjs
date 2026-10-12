/** Use Playwright's full Chromium, or a caller-supplied Chrome for Testing. */
export function browserOptions() {
  return process.env.TEMPO_CHROME
    ? {executablePath: process.env.TEMPO_CHROME}
    : {channel: 'chromium'};
}
