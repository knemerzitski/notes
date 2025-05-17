Service uses immutable state with package `immer`.

Structure:

- constants - Values that never change
- actions - Atomic functions that make up recipes
  - record - `ServiceRecord` operations
  - server-record - `ServiceServerRecord` operations
  - records - `state.records` and `state.index` operations
- recipes - Using definition is from `immer`. A function that goes into produce function and returns a new state.
  Can be curried if it requires arguments. Recipe is a complete mutation that must guarantee a valid state.
- meals - Contains complex logic that yields multiple recipes to be used.

Dependency flows only in one directoy `Service <- meals <- recipes <- actions`.
Allowed dependencies:

- Service
  - $meals
  - $recipes
- ComputedState
  - $actions
  - $constants
- $recipes
  - $actions
