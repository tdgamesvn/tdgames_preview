// jest.setup.ts
import '@testing-library/jest-dom'

// Node 18+ (and 26) ships native fetch/Request/Response globally.
// next/server's NextRequest bundles its own implementation — no polyfill needed.
