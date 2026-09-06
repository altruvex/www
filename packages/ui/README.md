# @repo/ui

Shared UI and design-system package for the Altruvex monorepo.

`@repo/ui` is the single source of truth for reusable presentation primitives, shared interaction patterns, semantic tokens, and the Liquid Glass visual language used by `apps/www` and `apps/admin`.

## Architecture

The package owns reusable UI primitives only. Business logic, data fetching, routing assumptions, entity-specific status registries, and app-specific composition stay inside the consuming app.

```txt
packages/ui
  src/components
  src/styles
  src/lib

apps/www   -> imports @repo/ui
apps/admin -> imports @repo/ui
```

## Components

Public exports come from the package root:

```tsx
import { Button, Card, Field, Input, Select, Sheet, TooltipProvider } from "@repo/ui";
```

Prefer root imports over deep imports so the package can evolve without spreading internal paths through the apps.

Core conventions:

- Components are typed and composition-first.
- Variants are preferred over duplicate components.
- Generic primitives avoid `next/*`, app state, API calls, and entity-specific semantics.
- Radix wrappers stay client components only where the underlying primitive requires it.

## Tokens

Shared CSS is imported from:

```css
@import "@repo/ui/styles";
```

The token layer defines semantic variables for color, typography, spacing, radius, shadows, motion, controls, and status tones. Apps may override token values for their composition needs while keeping the same vocabulary.

`www` uses a more spacious editorial scale. `admin` keeps its dense operational scale, but maps into the same component and material system.

## Liquid Glass

Liquid Glass is centralized in `src/styles/liquid-glass.css`.

Use the shared material classes and component variants:

```tsx
<Card variant="glass" />
<Surface variant="glass" />
<Button variant="glass" />
```

Utility classes:

- `liquid-glass`
- `liquid-glass-flat`
- `liquid-glass-panel`
- `liquid-glass-toolbar`

These utilities read variables such as `--glass-background`, `--glass-border`, `--glass-highlight`, `--glass-shadow`, and `--glass-blur`. Tune Liquid Glass intensity through tokens instead of scattering blur and shadow values through components.

Liquid Glass should communicate depth, translucency, layered hierarchy, and restrained highlights. When readability conflicts with translucency, readability wins.

## App Usage

Both apps should:

- Depend on `@repo/ui`.
- Include `@repo/ui` in `transpilePackages`.
- Import `@repo/ui/styles` from their global stylesheet.
- Add `packages/ui/src` to Tailwind source scanning.
- Keep app-specific UI, content, routing, and domain semantics local.

Admin-specific status registry components remain in `apps/admin` because they map product entities into visual states. Marketing typography helpers such as `Eyebrow`, `Num`, and rich text rendering remain in `apps/www` because they are content-composition primitives rather than shared controls.
