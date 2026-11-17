// Tests break things on purpose (timeouts, bad input), so the app logs are expected noise.
// Tests that check a log still see it with jest.spyOn(console, ...).
const quiet = (): void => undefined;

console.log = quiet;
console.info = quiet;
console.warn = quiet;
console.error = quiet;
