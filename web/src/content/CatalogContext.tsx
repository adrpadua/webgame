import { createContext, useContext, type ReactNode } from 'react'
import { catalog as loadedCatalog, type WorkbenchCatalog } from '@/store/catalog'

// The authored content, injected rather than subscribed.
//
// The catalog used to be a field on the Workbench store, which meant every
// component that needed a card title opened a store subscription to read it.
// That subscription could never fire: the catalog is built once at import,
// validated by the schemas (ADR 0020), and never written again. A dozen
// components were paying the cost of watching a constant.
//
// Context is what a constant dependency wants. It also gives the component
// tree a seam it did not have: a story, a probe, or a future second Encounter
// can render a subtree against a different catalog by wrapping it, without
// reaching into a global.

const CatalogContext = createContext<WorkbenchCatalog>(loadedCatalog)

export function CatalogProvider({ catalog = loadedCatalog, children }: { catalog?: WorkbenchCatalog; children: ReactNode }) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>
}

// The catalog for this subtree. Defaults to the loaded one, so a component
// rendered without a provider still works — the provider exists to override,
// not to switch the app on.
export function useCatalog(): WorkbenchCatalog {
  return useContext(CatalogContext)
}
