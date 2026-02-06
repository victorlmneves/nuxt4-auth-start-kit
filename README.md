# Nuxt4 Auth Start Kit

A production-ready SaaS starter kit built using Nuxt SaaS Template with Nuxt 4, Nuxt UI, and Tailwind CSS. Includes authentication flows, enterprise features, and a beautiful design system. Ideal for launching modern SaaS applications with speed and scalability.

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

- [Live demo](https://saas-template.nuxt.dev/)
- [Documentation](https://ui.nuxt.com/docs/getting-started/installation/nuxt)

<a href="https://saas-template.nuxt.dev/" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ui.nuxt.com/assets/templates/nuxt/saas-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://ui.nuxt.com/assets/templates/nuxt/saas-light.png">
    <img alt="Nuxt SaaS Template" src="https://ui.nuxt.com/assets/templates/nuxt/saas-light.png">
  </picture>
</a>

## Features
- **100+ UI Components**: Accessible, customizable Vue components powered by Nuxt UI and Tailwind CSS.
- **Authentication Ready**: Pre-built login, signup, and password reset flows using @sidebase/nuxt-auth and Auth0.
- **TypeScript First**: Full type safety and IntelliSense support.
- **Edge Performance**: SSR/SSG, code splitting, lazy loading, optimized for Core Web Vitals.
- **Dark Mode**: Automatic theme switching, respects system preferences.
- **Global Ready**: Built-in i18n, RTL/LTR layouts, @nuxt/fonts integration.
- **Content Management**: Markdown/YAML docs, blog, changelog, and custom pages via @nuxt/content.
- **Testing**: Unit and component tests with Vitest, E2E tests with Playwright.

## Project Structure
- `app/` — Main app, layouts, pages, components, stores, types, middleware
- `server/` — API routes, authentication, server utilities
- `content/` — Markdown/YAML docs, blog, changelog
- `public/` — Static assets
- `test/` & `tests/` — Unit, component, and E2E tests

## Getting Started

### Requirements
- Node.js >= 20.19.0
- pnpm (recommended)

### Installation
```bash
pnpm install
```

### Development
```bash
pnpm dev
```

### Build
```bash
pnpm build
```

### Testing
- **Unit/Component**: `pnpm test`
- **E2E**: `pnpm test:e2e`

## Authentication
- Uses @sidebase/nuxt-auth with Auth0 provider
- API endpoints in `server/api/auth/` and `server/routes/auth/`
- Example composable: `app/composables/useAuthentication.ts`

## Content & Docs
- Docs, blog, changelog in `content/` (Markdown/YAML)
- Customizable via @nuxt/content

## UI & Styling
- Nuxt UI module (`@nuxt/ui`)
- Tailwind CSS (`tailwind.config.js`)
- Semantic color aliases, design tokens

## Contributing
1. Fork the repo
2. Create a feature branch
3. Commit changes
4. Open a pull request

## License
MIT

---
For more details, see the docs in `content/1.docs/` or visit [Nuxt UI documentation](https://ui.nuxt.com/docs/getting-started/installation/nuxt).
