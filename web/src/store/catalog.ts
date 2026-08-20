import { loadCatalog } from '@/content'

// The authored content, loaded once for the whole app.
//
// It is a constant: every JSON payload under `data/` is validated at import
// (ADR 0020) and nothing at runtime edits it. That is why it lives here as a
// module value rather than on the store — a field on the store is a field
// components subscribe to, and a subscription to something that never
// changes is a re-render slot spent on nothing. Components read it through
// `useCatalog()`, which serves this same object through context.

export type WorkbenchCatalog = ReturnType<typeof loadCatalog>

export const catalog: WorkbenchCatalog = loadCatalog()
