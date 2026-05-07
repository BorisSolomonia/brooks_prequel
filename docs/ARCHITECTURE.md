# Backend Architecture — Module Layering

Brooks is a modular monolith. Modules live under `backend/` and each one is a Gradle subproject
declared in `settings.gradle.kts`. Module boundaries exist to make the eventual extraction or
reshape easier — they only pay off if the dependency graph actually stays clean.

## Module dependency graph (target)

```
common  ←  user  ←  auth
         ←  profile
         ←  guide  ←  search
         ←  social
         ←  purchase
         ←  memory
         ←  ai
              ↘
                app  (composition root)
```

- `common` is leaf — no module depends inward on anything.
- `user`, `auth`, `profile` are foundation modules. Other domain modules may depend on them.
- `guide`, `social`, `purchase`, `memory`, `search`, `ai` are sibling domain modules.
  **They should not depend on each other.**
- `app` is the composition root — it wires everything together and is the only module
  permitted to depend on every other module.

## Current violations of the layering rule

These exist today and we are deliberately not refactoring them in this round, but new code must
not extend the pattern.

| Violation | Where | Why it's a problem |
|---|---|---|
| `purchase` depends on `guide` and `profile` entities | `backend/purchase/build.gradle.kts`, `PurchaseService.java` imports `com.brooks.guide.domain.Guide` and `com.brooks.profile.repository.UserProfileRepository` | Sibling domain modules are coupled at the entity level. A schema change in `guide` forces a recompile in `purchase`. |
| `social` depends on `guide` for promotion validation | `backend/social/build.gradle.kts`, `StoryService.java` calls `guideRepository.findById(...)` to validate ownership when a story is created | Same issue — sibling-to-sibling coupling. |
| `guide` has its own `GuidePurchaseRepository` parallel to `purchase`'s `PurchaseRepository` | `backend/guide/repository/GuidePurchaseRepository.java` vs `backend/purchase/repository/PurchaseRepository.java` | Two repositories model the same concept with diverging status enums. |

## Rule for new code

When module A needs data owned by module B:

1. **Preferred:** module B exposes a small read-model DTO (e.g. `GuideSummaryView`) and a
   service method (`GuideQueryService.getSummary(id)`) that returns it. Module A depends only
   on the DTO and the query interface — never on B's entities or repositories.
2. **Acceptable for cross-cutting events:** publish an `ApplicationEvent` from B and listen
   from A. We already do this with `PurchaseCompletedEvent` (in `common.event`) — events that
   cross module boundaries belong in `common`.
3. **Forbidden:** importing another sibling module's `domain.*` classes, JPA repositories, or
   internal services.

## Why we keep the modular monolith shape

We are not chasing microservices. The module split:
- catches accidental coupling at compile time (Gradle refuses to compile if the dep is missing),
- makes the eventual extraction of any one bounded context (most likely `purchase`) into a
  separate service a contained refactor instead of a rewrite,
- keeps each domain's persistence + service + API in one place so a new contributor reading
  `backend/social/` sees everything social in one tree.

The cost of the split is real (more `build.gradle.kts` files, more import management). It only
remains worth paying if the layering rule above is enforced.
