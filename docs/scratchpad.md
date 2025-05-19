# Scratchpad

This document is used for general notes, lessons learned during development, and quick thoughts.

## Current Task

* **Rebuild Ledger View**: [`docs/implementation-plan/rebuild-ledger-view.md`](implementation-plan/rebuild-ledger-view.md)

## Lessons Learned

*(Add new lessons here in format `[YYYY-MM-DD] <lesson>`)*

[2024-06-10] Jest module mocks must include all named exports used by the component under test, or imports will be undefined at runtime.
[2024-06-10] In React tests, always use stable (non-recreated) mock state objects to avoid infinite update loops caused by changing dependencies in useEffect.
[2024-06-11] When mocking hooks or context in React tests, always use a stable reference for arrays/objects (e.g., move the mock array/object outside the mock implementation) to prevent infinite update loops caused by dependency changes in useEffect.
[2024-06-11] In Jest/jsdom tests, mock window.scrollTo and HTMLElement.prototype.scrollTo if your components use them, as jsdom does not implement these methods by default and will throw errors otherwise. 