# Parklink

Welcome to the official repository for **Parklink**. 

## About Parklink

Parklink is a comprehensive smart parking platform designed to take the friction out of urban mobility. We connect drivers with available parking spaces in real-time, streamlining the parking experience while providing lot operators with powerful, data-driven management tools.

### Key Features
*   **Real-Time Availability:** Instantly discover and navigate to open parking spots near your destination using live capacity data.
*   **Frictionless Payments & Reservations:** Book your spot in advance and securely pay directly through the app, eliminating the need for physical tickets or cash.
*   **Operator Dashboard:** A dedicated web portal for lot owners to manage capacity, monitor real-time usage, track revenue, and set dynamic pricing.

---

## Technical Overview

This repository is a monorepo powered by [Turborepo](https://turbo.build/repo) to efficiently manage our applications and shared packages. 

### Getting Started

To get started with development, clone the repository and install the dependencies:

```sh
git clone [https://github.com/your-org/parklink.git](https://github.com/your-org/parklink.git)
cd parklink
npm install

Architecture
This Turborepo includes the following packages and applications:

docs: a Next.js app for Parklink documentation

web: the main Parklink Next.js application

@repo/ui: a shared React component library used by both web and docs

@repo/eslint-config: Shared eslint configurations

@repo/typescript-config: Shared tsconfig.jsons used throughout the monorepo

Each package and app is 100% TypeScript.



Build & Develop
This repository comes pre-configured with industry-standard tools including TypeScript, ESLint, and Prettier.



Build
To build all apps and packages, run the following command from the root of the project:

# With global `turbo` installed (recommended)
turbo build

# To build a specific package (e.g., the docs app)
turbo build --filter=docs



Develop
To start the development servers for all apps and packages, run:

# With global `turbo` installed (recommended)
turbo dev

# To develop a specific package or app (e.g., the web app)
turbo dev --filter=web

Remote Caching
[!TIP]
Vercel Remote Cache is free for all plans.

Turborepo can use Remote Caching to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

To enable Remote Caching, authenticate the Turborepo CLI with your Vercel account:

# bash
turbo login


Next, link the Parklink Turborepo to your Remote Cache by running the following command from the root of the repository:

#bash
turbo link