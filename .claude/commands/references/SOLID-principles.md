# SOLID Principles — Quick Reference

Five object-oriented design principles that produce flexible, maintainable code.
Examples use Java syntax but the principles apply to any OO language — see the
language notes at the end of each section.

---

## S — Single Responsibility Principle

**A class or module should have only one reason to change.**

Each class or function should own exactly one piece of behaviour. If you find
yourself describing a class with "and", it likely has too many responsibilities.

- Split classes that mix business logic with persistence, formatting, or I/O
- A function that validates _and_ saves violates SRP — extract the persistence step

**Language notes**

- Python: applies to classes and modules equally; a module that does too much should be split
- Swift: applies to structs and classes; mix-ins via protocols can help isolate concerns
- Kotlin: data classes, use-case classes, and repository classes are natural SRP boundaries

---

## O — Open/Closed Principle

**Open for extension, closed for modification.**

Add new behaviour by extending or implementing — not by editing existing, tested code.
Polymorphism is the primary tool.

- Replace if/else or switch/match/when blocks that dispatch on type with an abstraction
- Each new type implements the abstraction; the calling code never changes

**Language notes**

- Java / Kotlin: `interface` or `abstract class`
- Swift: `protocol` with default implementations via extensions
- Python: Abstract Base Class (`abc.ABC`) or `Protocol` from `typing`
- TypeScript: `interface` or `abstract class`

---

## L — Liskov Substitution Principle

**Subtypes must be substitutable for their base type without altering correctness.**

Anywhere a base type is used, a subtype must behave consistently. Never weaken
preconditions, strengthen postconditions, or throw unexpected exceptions.

- Overriding a method to throw an unsupported-operation error is a red flag
- A subclass that silently ignores inherited behaviour violates LSP

**Language notes**

- Swift: a struct conforming to a protocol must honour all implied contracts, not just the signatures
- Python: duck typing makes LSP violations easier to miss — type hints and ABCs help enforce it
- Kotlin: `sealed class` hierarchies make LSP-safe exhaustive handling easier

---

## I — Interface Segregation Principle

**No client should be forced to depend on methods it does not use.**

Prefer several focused abstractions over one large general-purpose one.

- Split a fat interface into role-specific ones (`Readable`, `Writable` vs one `FileHandler`)
- A class that implements an abstraction but leaves several methods empty is a violation

**Language notes**

- Swift: protocols are naturally small — compose multiple protocols rather than building one large one
- Python: use separate ABCs or Protocol types for distinct roles
- Kotlin: prefer small interfaces; use delegation (`by`) to compose behaviour

---

## D — Dependency Inversion Principle

**Depend on abstractions, not concretions.**

High-level modules should not instantiate low-level modules directly. Both should depend
on an abstraction. Inject dependencies rather than creating them internally.

- Replace `new ConcreteService()` / `ConcreteService()` inside a class with a
  constructor/initialiser parameter typed to an abstraction
- Use a DI framework to wire implementations at runtime where appropriate

**Language notes**

- Java: Spring, Guice — `@Inject` constructor injection
- Kotlin / Android: Hilt (`@HiltViewModel`, `@Inject`), Koin
- Swift: manual initialiser injection is idiomatic; Swinject for larger projects
- Python: pass dependencies via `__init__`; `injector` library for larger codebases

---

## At a Glance

| Principle             | One-liner                    | Java/Kotlin tool         | Swift tool            | Python tool          |
| --------------------- | ---------------------------- | ------------------------ | --------------------- | -------------------- |
| Single Responsibility | One class, one job           | Extract class            | Extract struct/class  | Extract class/module |
| Open/Closed           | Extend, do not edit          | Interface + polymorphism | Protocol + extension  | ABC / Protocol       |
| Liskov Substitution   | Subtypes behave consistently | Correct inheritance      | Protocol contracts    | ABCs + type hints    |
| Interface Segregation | Small, focused abstractions  | Split interfaces         | Compose protocols     | Split ABCs           |
| Dependency Inversion  | Depend on abstractions       | Constructor injection    | Initialiser injection | **init** injection   |
