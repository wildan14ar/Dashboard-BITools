export default {
  "*.{ts,tsx,mjs,css,json,md}": "bunx biome check --write --no-errors-on-unmatched",
  "*.{ts,tsx}": () => "bunx tsc --noEmit",
}
