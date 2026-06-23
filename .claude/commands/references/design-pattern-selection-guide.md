# Design Pattern Selection Guide — Quick Reference

Combined pattern selection guide covering the Gang of Four (GoF) structural/behavioural
patterns and Martin Fowler Analysis Patterns for domain modelling.

Full details in the Second Brain:

- Design/Gang of Four Design Patterns.md
- Design/Analysis Patterns - Martin Fowler.md

Pattern reference docs in this folder:

- references/Pipeline-Design-Pattern.md

---

## GoF Patterns — Selection Guide

| Problem signal in code                                         | Pattern                 | Benefit                                                                                                     |
| -------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Complex object with many optional parameters                   | Builder                 | Readable construction, avoids telescoping constructors                                                      |
| One instance needed application-wide                           | Singleton               | Controlled shared access                                                                                    |
| if/switch block dispatching on type for behaviour              | Strategy                | Swap algorithms at runtime; closed to modification                                                          |
| Need to add behaviour without changing existing class          | Decorator               | Open/closed; composable extensions                                                                          |
| Complex subsystem exposed directly to callers                  | Facade                  | Simplified API; reduces coupling                                                                            |
| One object change must notify many dependents                  | Observer                | Decoupled event propagation                                                                                 |
| Actions that need undo/redo or queuing                         | Command or Memento      | Reversibility; audit trail                                                                                  |
| Behaviour changes based on object state                        | State                   | Eliminates state-flag if/switch chains                                                                      |
| Part-whole hierarchies treated uniformly                       | Composite               | Recursive tree structures                                                                                   |
| Two incompatible interfaces need to work together              | Adapter                 | Bridge without modifying either side                                                                        |
| Expensive or sensitive object needs controlled access          | Proxy                   | Lazy loading; protection; remote access                                                                     |
| Request passed through a chain of handlers                     | Chain of Responsibility | Decoupled pipeline; each handler decides pass/handle                                                        |
| Complex process decomposed into sequential, independent stages | Pipeline                | Single-responsibility stages; composable, independently testable; see references/Pipeline-Design-Pattern.md |
| Many objects communicate in complex, tangled ways              | Mediator                | Central coordination; reduces coupling                                                                      |
| Creating families of related objects                           | Abstract Factory        | Consistent product families; swappable themes                                                               |
| Object creation logic belongs in subclasses                    | Factory Method          | Deferred instantiation; extensible creation                                                                 |
| Copying expensive objects                                      | Prototype               | Clone instead of reconstruct                                                                                |
| Shared state across many fine-grained objects                  | Flyweight               | Memory efficiency at scale                                                                                  |

---

## Analysis Patterns (Fowler) — Selection Guide

These apply primarily to domain modelling rather than code structure.

| Problem signal in domain                           | Pattern                    | Benefit                                               |
| -------------------------------------------------- | -------------------------- | ----------------------------------------------------- |
| People and organisations treated as separate types | Party                      | Unified abstraction; shared contact/identity logic    |
| Responsibility chains need tracking and auditing   | Accountability             | Explicit, queryable responsibility records            |
| Measurements stored as raw numbers                 | Quantity + Measurement     | Unit safety; conversion; audit trail                  |
| Multiple org hierarchy views hardcoded in parallel | Organisation Structure     | Single model, multiple configurable views             |
| Product descriptions duplicated across instances   | Product + Product Type     | Separation of description from instance               |
| Product bundles and composites                     | Package                    | Composite product structure                           |
| Ledger / balance tracking without audit trail      | Account + Transactions     | Double-entry; immutable history; reconciliation       |
| Accounting rules embedded in business logic        | Posting Rules              | Rules externalised; change without code deployment    |
| Business rules hardcoded, not configurable         | Knowledge Level            | Rules separated from instances; runtime configuration |
| Entity has different IDs in different systems      | Identification Scheme      | Unified identity; cross-system resolution             |
| Plans compared against actuals                     | Plan + Resource Allocation | Intent vs. execution tracking                         |
| Names change over time or have multiple forms      | Name                       | Temporal name history; named type variants            |

---

## Combined Signals — What to Look For

| Code / design smell                                                              | Likely pattern family                |
| -------------------------------------------------------------------------------- | ------------------------------------ |
| Large if/switch/when on type or state                                            | Strategy, State, Factory Method      |
| Constructor with 5+ parameters                                                   | Builder                              |
| Two classes too tightly coupled                                                  | Facade, Mediator, Observer           |
| Adding features requires editing existing classes                                | Decorator, Strategy (OCP violation)  |
| Raw numbers for physical or financial values                                     | Quantity (Fowler)                    |
| Repeated instantiation of the same concrete class                                | Singleton, Prototype, Factory Method |
| Objects need undo or history                                                     | Command, Memento                     |
| Domain has people, orgs, roles                                                   | Party, Accountability (Fowler)       |
| Hierarchical data traversed uniformly                                            | Composite                            |
| Interface mismatch between components                                            | Adapter                              |
| Event-driven updates across many dependents                                      | Observer                             |
| Financial tracking without double-entry structure                                | Account + Transactions (Fowler)      |
| Multi-step process where each step should be isolated and independently testable | Pipeline                             |
