// Hermes (React Native) has no Web Crypto global, but mdma-runtime's
// `createDocumentStore` uses `crypto.randomUUID()` for the session id. Provide a
// tiny polyfill so the headless stack runs unchanged on device. (Demo-grade —
// for production use `expo-crypto` / `react-native-get-random-values`.)
const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };

if (!g.crypto) {
  g.crypto = {};
}

if (typeof g.crypto.randomUUID !== 'function') {
  g.crypto.randomUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
}
