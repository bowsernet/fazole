# Fazole — Bean Collecting App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Turborepo monorepo web app for tracking a bean collection — with Vite/React/Mantine frontend, Firebase
backend (Firestore, Cloud Functions, Storage), Google Auth, and image processing.

**Architecture:** Turborepo monorepo with two apps (`web`, `firebase-functions`) and two shared packages (`common`,
`config`). The frontend is a Vite+React SPA using Mantine UI 8.x with React Router v7 in library mode. The backend uses
Firebase v2 Cloud Functions, Firestore for data, and Firebase Storage for images with `sharp`-based optimization. Auth
is Google-only via Firebase Auth.

**Tech Stack:** TypeScript (strict), Vite, React, Mantine UI 8.x, React Router v7, react-hook-form, Firebase (Firestore,
Cloud Functions v2, Storage, Auth), Turborepo, pnpm, sharp, Prettier with import sorting

---

## Phase 1: Project Scaffolding & Tooling

### Task 1: Initialize Turborepo Monorepo

**Files:**

- Create: `package.json` (root)
- Create: `turbo.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Modify: `.prettierrc`
- Modify: `.gitignore`

**Step 1: Initialize root package.json and pnpm workspace**

```bash
pnpm init
```

Edit `package.json`:

```json
{
  "name": "fazole",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Step 2: Install Turborepo and Prettier plugin**

```bash
pnpm add -D turbo prettier @trivago/prettier-plugin-sort-imports
```

**Step 3: Configure turbo.json**

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
```

**Step 4: Create shared base tsconfig**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Step 5: Update .prettierrc with import sorting**

```json
{
  "singleQuote": true,
  "printWidth": 120,
  "trailingComma": "es5",
  "proseWrap": "always",
  "importOrder": ["dotenv", "^react", "^vite", "@mantine", "<THIRD_PARTY_MODULES>", "@/", "^\\."],
  "importOrderSeparation": true,
  "importOrderSortSpecifiers": true,
  "plugins": ["@trivago/prettier-plugin-sort-imports"]
}
```

**Step 6: Update .gitignore**

```gitignore
.idea
node_modules
dist
.turbo
*.local
.env
.env.*
!.env.example
```

**Step 7: Create directory structure**

```bash
mkdir -p apps/web apps/firebase-functions packages/common/src packages/config/src
```

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: initialize turborepo monorepo with pnpm workspace"
```

---

### Task 2: Set Up `packages/common`

**Files:**

- Create: `packages/common/package.json`
- Create: `packages/common/tsconfig.json`
- Create: `packages/common/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@fazole/common",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Step 3: Create src/index.ts**

```ts
// @fazole/common — shared types, constants, and validation
```

**Step 4: Install dependencies**

```bash
cd packages/common && pnpm install
```

**Step 5: Commit**

```bash
git add packages/common
git commit -m "chore: add packages/common skeleton"
```

---

### Task 3: Set Up `packages/config`

**Files:**

- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.json`
- Create: `packages/config/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@fazole/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Step 3: Create src/index.ts with image presets and shared config**

```ts
export const FIREBASE_REGION = 'europe-west1';

export const PAGINATION_PAGE_SIZE = 50;

export const IMAGE_PRESETS = {
  card: { width: 640, height: 480, fit: 'cover' as const },
  full: { width: 2048, height: 2048, fit: 'inside' as const },
  thumb: { width: 160, height: 160, fit: 'cover' as const },
} as const;

export type ImagePresetKey = keyof typeof IMAGE_PRESETS;

export const IMAGE_FORMATS = ['webp', 'avif'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
```

**Step 4: Install dependencies and commit**

```bash
cd packages/config && pnpm install
git add packages/config
git commit -m "chore: add packages/config with image presets and constants"
```

---

### Task 4: Set Up `apps/web` (Vite + React + Mantine)

**Files:**

- Create: `apps/web/` (Vite scaffold)
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`

Use context7 MCP to look up latest Vite, Mantine 8.x, and React Router v7 setup instructions.

**Step 1: Scaffold Vite app**

```bash
cd apps && pnpm create vite web --template react-ts
```

**Step 2: Install Mantine and other dependencies**

Use context7 for exact Mantine 8.x install instructions. Expected:

```bash
cd apps/web
pnpm add @mantine/core @mantine/hooks @mantine/notifications @mantine/dropzone @mantine/carousel \
  react-router embla-carousel-react @tabler/icons-react react-hook-form
pnpm add -D @types/react @types/react-dom postcss postcss-preset-mantine postcss-simple-vars
```

**Step 3: Configure path aliases in tsconfig.json**

Add to `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "paths": {
      "@/common/*": ["../../packages/common/src/*"],
      "@/config/*": ["../../packages/config/src/*"],
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

And in `vite.config.ts`, add resolve aliases to match.

**Step 4: Configure PostCSS for Mantine**

Create `apps/web/postcss.config.cjs`:

```js
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
```

**Step 5: Set up Mantine provider in main.tsx**

Replace `apps/web/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

import '@mantine/carousel/styles.css';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <Notifications />
      <App />
    </MantineProvider>
  </React.StrictMode>
);
```

**Step 6: Create minimal App component with router**

```tsx
import { ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Fazole</div>} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Step 7: Add workspace dependencies**

```bash
cd apps/web && pnpm add @fazole/common@workspace:* @fazole/config@workspace:*
```

**Step 8: Verify dev server starts**

```bash
cd apps/web && pnpm dev
```

Verify the app loads in browser at localhost with "Fazole" text.

**Step 9: Commit**

```bash
git add apps/web
git commit -m "chore: scaffold web app with Vite, React, Mantine 8.x, React Router v7"
```

---

### Task 5: Set Up `apps/firebase-functions`

**Files:**

- Create: `apps/firebase-functions/package.json`
- Create: `apps/firebase-functions/tsconfig.json`
- Create: `apps/firebase-functions/src/index.ts`

Use context7 MCP for Firebase Cloud Functions v2 setup.

**Step 1: Initialize firebase-functions package**

```json
{
  "name": "@fazole/firebase-functions",
  "version": "0.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "tsc --noEmit"
  },
  "engines": {
    "node": "22"
  }
}
```

**Step 2: Install firebase dependencies**

```bash
cd apps/firebase-functions
pnpm add firebase-functions firebase-admin sharp
pnpm add -D typescript @types/node
pnpm add @fazole/common@workspace:* @fazole/config@workspace:*
```

**Step 3: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "paths": {
      "@/common/*": ["../../packages/common/src/*"],
      "@/config/*": ["../../packages/config/src/*"]
    }
  },
  "include": ["src"]
}
```

Note: Cloud Functions may require CommonJS — verify with context7 and adjust if ESM is supported for the runtime.

**Step 4: Create src/index.ts**

```ts
// Cloud Functions entry point
export {};
```

**Step 5: Commit**

```bash
git add apps/firebase-functions
git commit -m "chore: scaffold firebase-functions app"
```

---

### Task 6: Firebase Project Configuration & Emulator

**Files:**

- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `firestore.rules`
- Create: `firestore.indexes.json`

**Step 1: Install firebase-tools**

```bash
pnpm add -D firebase-tools
```

**Step 2: Create firebase.json**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "apps/firebase-functions",
    "runtime": "nodejs22"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

**Step 3: Create firestore.rules**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users: only self or admins can read, only admins can write
    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow write: if isAdmin();
    }

    // Beans: everyone reads, admins write
    match /beans/{beanId} {
      allow read: if true;
      allow write: if isAdmin();

      // Images subcollection
      match /images/{imageId} {
        allow read: if true;
        allow write: if isAdmin();
      }
    }

    // GrowRecords: everyone reads, admins write
    match /growRecords/{recordId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Sources: everyone reads, admins write
    match /sources/{sourceId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

**Step 4: Create storage.rules**

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /beans/{beanId}/images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

**Step 5: Create firestore.indexes.json**

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

**Step 6: Create .firebaserc**

```json
{
  "projects": {
    "default": "fazole"
  }
}
```

**Step 7: Add emulator script to root package.json**

Add to root `package.json` scripts:

```json
{
  "emulators": "firebase emulators:start",
  "emulators:export": "firebase emulators:export ./firebase-export"
}
```

**Step 8: Add firebase-export to .gitignore**

**Step 9: Commit**

```bash
git add firebase.json .firebaserc firestore.rules firestore.indexes.json storage.rules package.json .gitignore
git commit -m "chore: add Firebase config, security rules, and emulator setup"
```

---

### Task 7: Install Vitest for Testing

**Files:**

- Create: `packages/common/vitest.config.ts`
- Modify: `packages/common/package.json`

**Step 1: Install vitest in common package**

```bash
cd packages/common && pnpm add -D vitest
```

**Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

**Step 3: Verify test runner works**

```bash
cd packages/common && pnpm test
```

Should succeed with "no tests found" (not an error).

**Step 4: Commit**

```bash
git add packages/common
git commit -m "chore: add vitest to packages/common"
```

---

## Phase 2: Shared Types, Constants & Validation

### Task 8: Define Entity Types in `packages/common`

**Files:**

- Create: `packages/common/src/types/index.ts`
- Create: `packages/common/src/types/user.ts`
- Create: `packages/common/src/types/bean.ts`
- Create: `packages/common/src/types/grow-record.ts`
- Create: `packages/common/src/types/source.ts`
- Create: `packages/common/src/types/image.ts`
- Modify: `packages/common/src/index.ts`

**Step 1: Create types/user.ts**

```ts
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  role: UserRole;
  displayName: string;
  createdAt: number; // unix epoch ms
  updatedAt: number;
}
```

**Step 2: Create types/bean.ts**

```ts
export type BeanSpecies = 'vulgaris' | 'lima' | 'scarlet';
export type PodType = 'snap' | 'dry';
export type PlantType = 'bush' | 'semi' | 'runner';
export type BeanColor = 'white' | 'yellow' | 'brown' | 'pink' | 'red' | 'purple' | 'black';

export interface Bean {
  id: string;
  name: string;
  species: BeanSpecies;
  podType: PodType;
  plantType: PlantType;
  beansPerPod?: number;
  beanSize?: number; // mm
  beanWeight?: number; // mg
  beanColor1?: BeanColor;
  beanColor2?: BeanColor;
  beanColor3?: BeanColor;
  sourceId: string;
  description?: string;
  sourceDescription?: string;
  yearsGrown: number[];
  deletedInSource?: boolean;
  deletedAt?: number; // unix epoch ms, soft delete
  createdAt: number;
  updatedAt: number;
}
```

**Step 3: Create types/image.ts**

```ts
import type { ImageFormat, ImagePresetKey } from '@fazole/config';

export type ImageType = 'source' | 'closeup' | 'bunch' | 'seedling' | 'flower' | 'pod' | 'plant';

export interface BeanImage {
  id: string;
  type: ImageType;
  year: number;
  primary: boolean;
  paths: Partial<Record<`${ImagePresetKey}_${ImageFormat}`, string>>;
  urls: Partial<Record<`${ImagePresetKey}_${ImageFormat}`, string>>;
  originalPath: string;
  createdAt: number;
  updatedAt: number;
}
```

**Step 4: Create types/grow-record.ts**

```ts
export interface GrowRecord {
  id: string;
  year: number;
  beanId: string;
  preplantDate?: number; // unix epoch ms
  plantDate?: number;
  sproutDate?: number;
  flowerDate?: number;
  harvestStartDate?: number;
  harvestEndDate?: number;
  deletedAt?: number; // soft delete
  createdAt: number;
  updatedAt: number;
}
```

**Step 5: Create types/source.ts**

```ts
export interface Source {
  id: string;
  name: string; // unique
  color: string; // mantine color key
  link: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}
```

**Step 6: Create types/index.ts barrel and update src/index.ts**

```ts
// types/index.ts
export * from './user';
export * from './bean';
export * from './grow-record';
export * from './source';
export * from './image';
```

```ts
// src/index.ts
export * from './types';
```

**Step 7: Verify compilation**

```bash
cd packages/common && pnpm lint
```

**Step 8: Commit**

```bash
git add packages/common
git commit -m "feat: add entity types for users, beans, grow records, sources, images"
```

---

### Task 9: Add Bean Color Constants & Validation Helpers

**Files:**

- Create: `packages/common/src/constants/index.ts`
- Create: `packages/common/src/constants/bean-colors.ts`
- Create: `packages/common/src/validation/index.ts`
- Create: `packages/common/src/validation/bean.ts`
- Create: `packages/common/src/__tests__/validation/bean.test.ts`
- Modify: `packages/common/src/index.ts`

**Step 1: Write failing test for bean validation**

```ts
// packages/common/src/__tests__/validation/bean.test.ts
import { describe, expect, it } from 'vitest';

import { BEAN_COLORS, isValidBeanColor } from '../../constants/bean-colors';

describe('bean colors', () => {
  it('should contain expected colors', () => {
    expect(BEAN_COLORS).toContain('white');
    expect(BEAN_COLORS).toContain('black');
    expect(BEAN_COLORS).toHaveLength(7);
  });

  it('should validate valid colors', () => {
    expect(isValidBeanColor('red')).toBe(true);
    expect(isValidBeanColor('purple')).toBe(true);
  });

  it('should reject invalid colors', () => {
    expect(isValidBeanColor('orange')).toBe(false);
    expect(isValidBeanColor('')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/common && pnpm test
```

Expected: FAIL — module not found.

**Step 3: Implement bean-colors.ts**

```ts
// packages/common/src/constants/bean-colors.ts
import type { BeanColor } from '../types/bean';

export const BEAN_COLORS: readonly BeanColor[] = [
  'white',
  'yellow',
  'brown',
  'pink',
  'red',
  'purple',
  'black',
] as const;

export function isValidBeanColor(value: string): value is BeanColor {
  return (BEAN_COLORS as readonly string[]).includes(value);
}
```

Create barrel `packages/common/src/constants/index.ts`:

```ts
export * from './bean-colors';
```

Update `packages/common/src/index.ts`:

```ts
export * from './types';
export * from './constants';
```

**Step 4: Run test to verify it passes**

```bash
cd packages/common && pnpm test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/common
git commit -m "feat: add bean color constants and validation"
```

---

## Phase 3: Firebase Backend

### Task 10: `beforeUserCreated` Auth Function

**Files:**

- Create: `apps/firebase-functions/src/auth/before-user-created.ts`
- Modify: `apps/firebase-functions/src/index.ts`

Use context7 MCP for Firebase Functions v2 `beforeUserCreated` blocking function setup.

**Step 1: Implement the blocking function**

```ts
// apps/firebase-functions/src/auth/before-user-created.ts
import { FIREBASE_REGION } from '@fazole/config';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeUserCreated } from 'firebase-functions/v2/identity';

export const onBeforeUserCreated = beforeUserCreated({ region: FIREBASE_REGION }, async (event) => {
  const db = getFirestore();
  const usersSnapshot = await db.collection('users').limit(1).get();
  const isFirstUser = usersSnapshot.empty;

  await db
    .collection('users')
    .doc(event.data.uid)
    .set({
      role: isFirstUser ? 'admin' : 'user',
      displayName: event.data.displayName || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
});
```

**Step 2: Initialize firebase-admin and export from index.ts**

```ts
// apps/firebase-functions/src/index.ts
import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { onBeforeUserCreated } from './auth/before-user-created';
```

**Step 3: Build and verify no compilation errors**

```bash
cd apps/firebase-functions && pnpm build
```

**Step 4: Commit**

```bash
git add apps/firebase-functions
git commit -m "feat: add beforeUserCreated function (first user = admin)"
```

---

### Task 11: `onGrowRecordWrite` Trigger — Update Bean `yearsGrown`

**Files:**

- Create: `apps/firebase-functions/src/triggers/grow-record-write.ts`
- Modify: `apps/firebase-functions/src/index.ts`

Use context7 MCP for Firestore v2 `onDocumentWritten` trigger.

**Step 1: Implement the trigger**

```ts
// apps/firebase-functions/src/triggers/grow-record-write.ts
import { FIREBASE_REGION } from '@fazole/config';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

export const onGrowRecordWrite = onDocumentWritten(
  { document: 'growRecords/{recordId}', region: FIREBASE_REGION },
  async (event) => {
    const db = getFirestore();
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    // Determine which bean(s) need yearsGrown recalculated
    const beanIds = new Set<string>();
    if (before?.beanId) beanIds.add(before.beanId);
    if (after?.beanId) beanIds.add(after.beanId);

    for (const beanId of beanIds) {
      const recordsSnap = await db
        .collection('growRecords')
        .where('beanId', '==', beanId)
        .where('deletedAt', '==', null)
        .get();

      const years = [...new Set(recordsSnap.docs.map((d) => d.data().year))].sort();

      await db.collection('beans').doc(beanId).update({
        yearsGrown: years,
        updatedAt: Date.now(),
      });
    }
  }
);
```

**Step 2: Export from index.ts**

Add to `apps/firebase-functions/src/index.ts`:

```ts
export { onGrowRecordWrite } from './triggers/grow-record-write';
```

**Step 3: Build and verify**

```bash
cd apps/firebase-functions && pnpm build
```

**Step 4: Commit**

```bash
git add apps/firebase-functions
git commit -m "feat: add onGrowRecordWrite trigger to update bean yearsGrown"
```

---

### Task 12: Image Processing Cloud Function

**Files:**

- Create: `apps/firebase-functions/src/storage/on-image-upload.ts`
- Modify: `apps/firebase-functions/src/index.ts`

Use context7 MCP for Firebase Storage `onObjectFinalized` trigger and sharp usage.

**Step 1: Implement image processing function**

This function triggers on Storage upload, generates optimized variants (WebP + AVIF for each preset), saves them back to
Storage, and updates the Firestore image document with paths and URLs.

```ts
// apps/firebase-functions/src/storage/on-image-upload.ts
import { FIREBASE_REGION, IMAGE_FORMATS, IMAGE_PRESETS } from '@fazole/config';
import type { ImageFormat, ImagePresetKey } from '@fazole/config';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import sharp from 'sharp';

export const onImageUpload = onObjectFinalized({ region: FIREBASE_REGION }, async (event) => {
  const filePath = event.data.name;
  if (!filePath) return;

  // Only process originals: beans/{beanId}/images/{imageId}.{ext}
  const match = filePath.match(/^beans\/([^/]+)\/images\/([^/]+)\.(\w+)$/);
  if (!match) return;

  const [, beanId, imageId] = match;
  const bucket = getStorage().bucket(event.data.bucket);
  const db = getFirestore();

  // Download original
  const [buffer] = await bucket.file(filePath).download();

  const paths: Record<string, string> = {};
  const urls: Record<string, string> = {};

  // Generate variants
  for (const [presetName, preset] of Object.entries(IMAGE_PRESETS)) {
    for (const format of IMAGE_FORMATS) {
      const key = `${presetName}_${format}` as `${ImagePresetKey}_${ImageFormat}`;
      const outputPath = `beans/${beanId}/images/${imageId}_${presetName}.${format}`;

      const processed = await sharp(buffer)
        .resize(preset.width, preset.height, { fit: preset.fit })
        .toFormat(format)
        .toBuffer();

      const file = bucket.file(outputPath);
      await file.save(processed, {
        metadata: { contentType: `image/${format}` },
      });
      await file.makePublic();

      paths[key] = outputPath;
      urls[key] = file.publicUrl();
    }
  }

  // Update Firestore image document
  await db
    .collection('beans')
    .doc(beanId)
    .collection('images')
    .doc(imageId)
    .update({ paths, urls, updatedAt: Date.now() });
});
```

**Step 2: Export from index.ts**

```ts
export { onImageUpload } from './storage/on-image-upload';
```

**Step 3: Build and verify**

```bash
cd apps/firebase-functions && pnpm build
```

**Step 4: Commit**

```bash
git add apps/firebase-functions
git commit -m "feat: add image processing function (sharp variants on upload)"
```

---

### Task 13: Referential Integrity Cloud Function

**Files:**

- Create: `apps/firebase-functions/src/triggers/referential-integrity.ts`
- Modify: `apps/firebase-functions/src/index.ts`

Prevent deletion of documents that other documents depend on (e.g., sources with beans, beans with grow records).

**Step 1: Implement onSourceDelete check**

```ts
// apps/firebase-functions/src/triggers/referential-integrity.ts
import { FIREBASE_REGION } from '@fazole/config';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
// Instead of blocking deletes (which Firestore triggers can't do),
// use a callable function for safe deletion
import { onCall } from 'firebase-functions/v2/https';

export const deleteSource = onCall({ region: FIREBASE_REGION }, async (request) => {
  const db = getFirestore();
  const { sourceId } = request.data;

  // Check for beans referencing this source
  const beansSnap = await db.collection('beans').where('sourceId', '==', sourceId).limit(1).get();

  if (!beansSnap.empty) {
    throw new HttpsError('failed-precondition', 'Cannot delete source: beans reference this source');
  }

  await db.collection('sources').doc(sourceId).delete();
  return { success: true };
});

export const deleteBeanHard = onCall({ region: FIREBASE_REGION }, async (request) => {
  const db = getFirestore();
  const { beanId } = request.data;

  const recordsSnap = await db.collection('growRecords').where('beanId', '==', beanId).limit(1).get();

  if (!recordsSnap.empty) {
    throw new HttpsError('failed-precondition', 'Cannot hard-delete bean: grow records reference this bean');
  }

  await db.collection('beans').doc(beanId).delete();
  return { success: true };
});
```

**Step 2: Export from index.ts**

```ts
export { deleteSource, deleteBeanHard } from './triggers/referential-integrity';
```

**Step 3: Build and verify**

```bash
cd apps/firebase-functions && pnpm build
```

**Step 4: Commit**

```bash
git add apps/firebase-functions
git commit -m "feat: add callable functions for safe deletion with referential integrity"
```

---

## Phase 4: Frontend Foundation

### Task 14: Firebase Client SDK Setup

**Files:**

- Create: `apps/web/src/lib/firebase.ts`
- Create: `apps/web/.env.example`

Use context7 for Firebase v10+ modular SDK setup.

**Step 1: Install firebase**

```bash
cd apps/web && pnpm add firebase
```

**Step 2: Create .env.example**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_USE_EMULATORS=false
```

**Step 3: Create lib/firebase.ts**

```ts
import { FIREBASE_REGION } from '@fazole/config';
import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, FIREBASE_REGION);

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

**Step 4: Commit**

```bash
git add apps/web
git commit -m "feat: add Firebase client SDK initialization with emulator support"
```

---

### Task 15: Auth Context & Hook

**Files:**

- Create: `apps/web/src/hooks/use-auth.ts`
- Create: `apps/web/src/hooks/index.ts`
- Create: `apps/web/src/types/auth.ts`
- Create: `apps/web/src/types/index.ts`

**Step 1: Create auth context and hook**

```tsx
// apps/web/src/hooks/use-auth.ts
import { type ReactElement, type ReactNode, createContext, useContext, useEffect, useState } from 'react';

import type { User, UserRole } from '@fazole/common';
import {
  type User as FirebaseUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../lib/firebase';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userDoc: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        setUserDoc(snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logOut = async (): Promise<void> => {
    await signOut(auth);
  };

  const isAdmin = userDoc?.role === 'admin';

  return (
    <AuthContext value={{ firebaseUser, userDoc, loading, isAdmin, signInWithGoogle, logOut }}>{children}</AuthContext>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

**Step 2: Create barrel files**

```ts
// apps/web/src/hooks/index.ts
export { AuthProvider, useAuth } from './use-auth';
```

**Step 3: Wrap App with AuthProvider in main.tsx**

**Step 4: Commit**

```bash
git add apps/web/src
git commit -m "feat: add auth context, provider, and useAuth hook"
```

---

### Task 16: App Layout (Navbar, Footer, Content Area)

**Files:**

- Create: `apps/web/src/components/layout/AppLayout.tsx`
- Create: `apps/web/src/components/layout/AppNavbar.tsx`
- Create: `apps/web/src/components/layout/AppFooter.tsx`
- Create: `apps/web/src/components/layout/UserMenu.tsx`
- Create: `apps/web/src/components/layout/index.ts`
- Create: `apps/web/src/components/index.ts`
- Create: `apps/web/src/components/layout/AppLayout.module.css`

Use context7 MCP for Mantine 8.x AppShell component and responsive layout.

**Step 1: Create AppNavbar**

Navbar with:

- Left: App name "Fazole"
- Right: inline menu (Beans, Seasons, Grow Records) + Admin submenu (Sources, Users) visible to admins + UserMenu

Use Mantine `AppShell.Header`, `Group`, `Menu`, `Button`.

**Step 2: Create UserMenu**

- When signed out: "Sign in" button (calls `signInWithGoogle`)
- When signed in: User name with dropdown containing "Sign out"

**Step 3: Create AppFooter**

Minimal footer with link to https://c0decafe.dev.

**Step 4: Create AppLayout**

Uses Mantine `AppShell` with `header` and `footer`. Content area constrained to ~1200px with `Container`.

**Step 5: Create AppLayout.module.css**

Basic layout CSS module with media queries for responsive layout (mobile-first).

**Step 6: Update App.tsx to use AppLayout**

Wrap routes with `<AppLayout>`.

**Step 7: Verify dev server renders layout**

**Step 8: Commit**

```bash
git add apps/web/src
git commit -m "feat: add app layout with navbar, footer, and user menu"
```

---

### Task 17: Routing Setup

**Files:**

- Create: `apps/web/src/pages/HomePage.tsx`
- Create: `apps/web/src/pages/beans/BeanListPage.tsx`
- Create: `apps/web/src/pages/beans/BeanDetailPage.tsx`
- Create: `apps/web/src/pages/beans/BeanEditPage.tsx`
- Create: `apps/web/src/pages/grow-records/GrowRecordListPage.tsx`
- Create: `apps/web/src/pages/grow-records/GrowRecordEditPage.tsx`
- Create: `apps/web/src/pages/seasons/SeasonsPage.tsx`
- Create: `apps/web/src/pages/sources/SourcesPage.tsx`
- Create: `apps/web/src/pages/users/UsersPage.tsx`
- Create: `apps/web/src/pages/index.ts`
- Modify: `apps/web/src/App.tsx`

**Step 1: Create stub pages**

Each page is a minimal component with just the page title and breadcrumbs. For example:

```tsx
// apps/web/src/pages/HomePage.tsx
import { ReactElement } from 'react';

import { Title } from '@mantine/core';

export function HomePage(): ReactElement {
  return <Title order={1}>Home</Title>;
}
```

Create similar stubs for all other pages.

**Step 2: Create barrel file**

```ts
// apps/web/src/pages/index.ts
export { HomePage } from './HomePage';
export { BeanListPage } from './beans/BeanListPage';
// ... etc
```

**Step 3: Set up routes in App.tsx**

```tsx
<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route index element={<HomePage />} />
    <Route path="beans" element={<BeanListPage />} />
    <Route path="beans/:id" element={<BeanDetailPage />} />
    <Route path="beans/:id/edit" element={<BeanEditPage />} />
    <Route path="beans/new" element={<BeanEditPage />} />
    <Route path="grow-records" element={<GrowRecordListPage />} />
    <Route path="grow-records/:id/edit" element={<GrowRecordEditPage />} />
    <Route path="grow-records/new" element={<GrowRecordEditPage />} />
    <Route path="seasons" element={<SeasonsPage />} />
    <Route path="sources" element={<SourcesPage />} />
    <Route path="users" element={<UsersPage />} />
  </Route>
</Routes>
```

Update `AppLayout` to use `<Outlet />` for nested routes.

**Step 4: Verify all routes render stub pages**

**Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat: add routing with stub pages for all routes"
```

---

### Task 18: Shared UI Components (Loading, Error, Empty States)

**Files:**

- Create: `apps/web/src/components/ui/LoadingState.tsx`
- Create: `apps/web/src/components/ui/ErrorState.tsx`
- Create: `apps/web/src/components/ui/EmptyState.tsx`
- Create: `apps/web/src/components/ui/PageBreadcrumbs.tsx`
- Create: `apps/web/src/components/ui/index.ts`

**Step 1: Create LoadingState**

A centered `Loader` component from Mantine.

**Step 2: Create ErrorState**

An `Alert` with error message and a "Retry" button.

**Step 3: Create EmptyState**

A centered text message for when lists are empty.

**Step 4: Create PageBreadcrumbs**

A thin wrapper around Mantine's `Breadcrumbs` component that takes an array of `{ label, href? }`.

**Step 5: Commit**

```bash
git add apps/web/src/components/ui
git commit -m "feat: add shared UI components (loading, error, empty states, breadcrumbs)"
```

---

### Task 19: Firestore Data Access Layer

**Files:**

- Create: `apps/web/src/lib/firestore/sources.ts`
- Create: `apps/web/src/lib/firestore/beans.ts`
- Create: `apps/web/src/lib/firestore/grow-records.ts`
- Create: `apps/web/src/lib/firestore/users.ts`
- Create: `apps/web/src/lib/firestore/images.ts`
- Create: `apps/web/src/lib/firestore/index.ts`
- Create: `apps/web/src/lib/index.ts`

**Step 1: Create sources.ts**

CRUD functions for sources collection:

- `fetchSources(): Promise<Source[]>`
- `fetchSource(id: string): Promise<Source>`
- `createSource(data: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>`
- `updateSource(id: string, data: Partial<Source>): Promise<void>`
- `callDeleteSource(sourceId: string): Promise<void>` (calls the Cloud Function)

**Step 2: Create beans.ts**

CRUD + query functions for beans:

- `fetchBeans(filters?, sort?, page?): Promise<{ beans: Bean[], total: number }>`
- `fetchBean(id: string): Promise<Bean>`
- `createBean(data): Promise<string>`
- `updateBean(id: string, data): Promise<void>`
- `softDeleteBean(id: string): Promise<void>`
- `restoreBean(id: string): Promise<void>`

**Step 3: Create grow-records.ts**

CRUD for grow records, similar pattern.

**Step 4: Create users.ts**

- `fetchUsers(): Promise<User[]>`
- `fetchUser(id: string): Promise<User>`
- `updateUserRole(id: string, role: UserRole): Promise<void>`

**Step 5: Create images.ts**

- `fetchBeanImages(beanId: string): Promise<BeanImage[]>`
- `uploadBeanImage(beanId: string, file: File, metadata: Partial<BeanImage>): Promise<string>`
- `updateBeanImage(beanId: string, imageId: string, data: Partial<BeanImage>): Promise<void>`
- `deleteBeanImage(beanId: string, imageId: string): Promise<void>`

**Step 6: Barrel exports**

**Step 7: Commit**

```bash
git add apps/web/src/lib
git commit -m "feat: add Firestore data access layer for all entities"
```

---

### Task 20: Data Fetching Hook

**Files:**

- Create: `apps/web/src/hooks/use-query.ts`
- Create: `apps/web/src/__tests__/hooks/use-query.test.ts`
- Modify: `apps/web/src/hooks/index.ts`

A simple data-fetching hook that handles loading/error/data states.

**Step 1: Write failing test**

```ts
import { describe, expect, it, vi } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';

import { useQuery } from '../../hooks/use-query';

describe('useQuery', () => {
  it('should return data after successful fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: '1', name: 'Test' });
    const { result } = renderHook(() => useQuery(fetcher));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual({ id: '1', name: 'Test' });
      expect(result.current.error).toBeNull();
    });
  });

  it('should return error on failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useQuery(fetcher));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should refetch when refetch is called', async () => {
    const fetcher = vi.fn().mockResolvedValue('v1');
    const { result } = renderHook(() => useQuery(fetcher));

    await waitFor(() => expect(result.current.data).toBe('v1'));

    fetcher.mockResolvedValue('v2');
    result.current.refetch();

    await waitFor(() => expect(result.current.data).toBe('v2'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement useQuery hook**

```ts
import { useCallback, useEffect, useState } from 'react';

interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trigger, ...deps]);

  return { data, loading, error, refetch };
}
```

**Step 4: Run test to verify it passes**

**Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat: add useQuery data fetching hook with tests"
```

---

## Phase 5: Sources CRUD (Simplest Feature First)

### Task 21: Sources Page — List & Modal CRUD

**Files:**

- Create: `apps/web/src/pages/sources/SourcesPage.tsx` (replace stub)
- Create: `apps/web/src/components/sources/SourceTable.tsx`
- Create: `apps/web/src/components/sources/SourceForm.tsx`
- Create: `apps/web/src/components/sources/index.ts`

Use context7 for Mantine `Modal`, `Table`, react-hook-form integration.

**Step 1: Create SourceForm**

A react-hook-form form inside a Mantine `Modal`. Fields: name, color (color picker from Mantine palette), link,
description. Handles create and edit modes.

**Step 2: Create SourceTable**

Mantine `Table` showing all sources with columns: name (colored badge), link, description, actions (edit/delete). Delete
calls the `deleteSource` callable function.

**Step 3: Assemble SourcesPage**

- Breadcrumbs
- "Add Source" button (admin only)
- SourceTable
- SourceForm modal (opens on add/edit)
- Loading/error/empty states

**Step 4: Implement delete with confirmation dialog**

Use Mantine `modals.openConfirmModal` for hard delete confirmation.

**Step 5: Verify CRUD works with emulator**

**Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat: add sources page with modal CRUD"
```

---

## Phase 6: Beans

### Task 22: Bean List Page — Card & Table Views

**Files:**

- Create: `apps/web/src/pages/beans/BeanListPage.tsx` (replace stub)
- Create: `apps/web/src/components/beans/BeanCard.tsx`
- Create: `apps/web/src/components/beans/BeanTable.tsx`
- Create: `apps/web/src/components/beans/BeanFilters.tsx`
- Create: `apps/web/src/components/beans/index.ts`

Use context7 for Mantine `SimpleGrid`, `Table`, `SegmentedControl`, `Pagination`, `Select`.

**Step 1: Create BeanCard**

Card component with: image (placeholder if none), name, pills (species, podType, plantType), years grown list.

**Step 2: Create BeanTable**

Table with columns: image thumb, name, pod type, plant type, bean size, bean colors (combined), last year grown.
Sortable headers.

**Step 3: Create BeanFilters**

Responsive filter component:

- Species select
- Pod type select
- Plant type select
- Year grown select
- Color select
- Source autocomplete
- Filters combine with AND

Layout: sidebar on large, horizontal on medium, collapsible horizontal on small.

**Step 4: Assemble BeanListPage**

- Breadcrumbs
- View toggle (card/table) via `SegmentedControl`
- "Add Bean" button (admin only)
- Filters + list area
- Pagination (50 per page)
- Loading/error/empty states

**Step 5: Verify with emulator**

**Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat: add bean list page with card/table views and filters"
```

---

### Task 23: Bean Detail Page

**Files:**

- Create: `apps/web/src/pages/beans/BeanDetailPage.tsx` (replace stub)
- Create: `apps/web/src/components/beans/BeanImageGallery.tsx`
- Create: `apps/web/src/components/beans/BeanProperties.tsx`
- Create: `apps/web/src/components/beans/BeanGrowHistory.tsx`

Use context7 for Mantine `Carousel` (from @mantine/carousel) and layout components.

**Step 1: Create BeanImageGallery**

- Horizontal scrollable image strip using Mantine Carousel
- On click, open lightbox/fullscreen gallery
- Falls back to source type images if closeup not available

**Step 2: Create BeanProperties**

Display all bean properties as stats/pills with Tabler icons:

- Species, pod type, plant type, bean size, weight, colors
- Description with source fallback (different background + source name badge)

**Step 3: Create BeanGrowHistory**

Table of grow records for this bean. Columns: year, all date fields. Edit/delete buttons for admins. No pagination
needed.

**Step 4: Assemble BeanDetailPage**

- Breadcrumbs (Home > Beans > Bean Name)
- Image gallery
- Properties section
- Grow history section
- Edit button (admin), Add Grow Record button (admin)

**Step 5: Implement soft delete for grow records**

Soft delete with undo toast notification (10 second window).

**Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat: add bean detail page with gallery, properties, grow history"
```

---

### Task 24: Bean Edit Page (Form + Image Management)

**Files:**

- Create: `apps/web/src/pages/beans/BeanEditPage.tsx` (replace stub)
- Create: `apps/web/src/components/beans/BeanForm.tsx`
- Create: `apps/web/src/components/beans/BeanImageManager.tsx`

Use context7 for react-hook-form with Mantine, @mantine/dropzone.

**Step 1: Create BeanForm**

Full-page react-hook-form form with all bean fields:

- name (TextInput)
- species (Select)
- podType (Select)
- plantType (Select)
- beansPerPod, beanSize, beanWeight (NumberInput)
- beanColor1/2/3 (Select with color swatches)
- sourceId (Select, populated from sources)
- description (Textarea)
- sourceDescription (Textarea)

Three buttons: Cancel, Save & Go Back, Save & Stay.

**Step 2: Create BeanImageManager**

Inside the bean edit form:

- Dropzone for uploading new images (accepts jpeg, png, webp, avif)
- Table of existing images with: thumbnail, type (select), year (number), primary (checkbox)
- Drag & drop reordering
- Delete button per image

**Step 3: Assemble BeanEditPage**

- Breadcrumbs (Home > Beans > Bean Name > Edit or Home > Beans > New)
- BeanForm with BeanImageManager
- Loading state when editing existing bean
- Handles both create and edit modes (check for `:id` param vs `/new` route)

**Step 4: Implement soft delete for beans**

- Soft delete sets `deletedAt` timestamp
- Undo toast notification (10 second window), calls `restoreBean` on undo

**Step 5: Verify with emulator**

**Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat: add bean edit page with form and image management"
```

---

## Phase 7: Grow Records

### Task 25: Grow Record List Page

**Files:**

- Create: `apps/web/src/pages/grow-records/GrowRecordListPage.tsx` (replace stub)
- Create: `apps/web/src/components/grow-records/GrowRecordTable.tsx`
- Create: `apps/web/src/components/grow-records/GrowRecordFilters.tsx`
- Create: `apps/web/src/components/grow-records/index.ts`

**Step 1: Create GrowRecordFilters**

- Year select (populated from available years)
- Bean name autocomplete
- Same responsive layout pattern as BeanFilters

**Step 2: Create GrowRecordTable**

Table with columns: bean name (link to bean detail), year, all date fields, actions (edit/soft-delete for admins).

**Step 3: Assemble GrowRecordListPage**

- Breadcrumbs
- Filters
- Table with pagination (50 per page)
- Default sort by year descending
- Loading/error/empty states

**Step 4: Commit**

```bash
git add apps/web/src
git commit -m "feat: add grow record list page with filters and table"
```

---

### Task 26: Grow Record Edit Page

**Files:**

- Create: `apps/web/src/pages/grow-records/GrowRecordEditPage.tsx` (replace stub)
- Create: `apps/web/src/components/grow-records/GrowRecordForm.tsx`

**Step 1: Create GrowRecordForm**

Full-page react-hook-form form:

- beanId (Select, populated from beans. Pre-filled if `?beanId=xxx` query param)
- year (NumberInput)
- preplantDate, plantDate, sproutDate, flowerDate, harvestStartDate, harvestEndDate (DateInput from Mantine)

Three buttons: Cancel, Save & Go Back, Save & Stay.

**Step 2: Assemble GrowRecordEditPage**

- Breadcrumbs
- Form
- Handles create and edit modes

**Step 3: Verify with emulator**

**Step 4: Commit**

```bash
git add apps/web/src
git commit -m "feat: add grow record edit page"
```

---

## Phase 8: Seasons & Homepage

### Task 27: Seasons Page

**Files:**

- Create: `apps/web/src/pages/seasons/SeasonsPage.tsx` (replace stub)
- Create: `apps/web/src/components/seasons/SeasonsTable.tsx`
- Create: `apps/web/src/components/seasons/InlineBeanCard.tsx`

**Step 1: Create InlineBeanCard**

Tiny inline card: small image + bean name, links to bean detail.

**Step 2: Create SeasonsTable**

Table with columns:

- Year (link — currently just anchor, no separate season detail page)
- Number of beans grown
- List of beans as InlineBeanCards

Default sort by year descending.

**Step 3: Assemble SeasonsPage**

- Breadcrumbs
- SeasonsTable
- Loading/error/empty states
- Data derived from grow records grouped by year

**Step 4: Commit**

```bash
git add apps/web/src
git commit -m "feat: add seasons overview page"
```

---

### Task 28: Homepage

**Files:**

- Create: `apps/web/src/pages/HomePage.tsx` (replace stub)

**Step 1: Implement HomePage**

- Title: "Grown this year" (or "Grown last year" for Jan–June)
- Determine current display year: if month is July–December use current year, else use previous year
- Fetch beans for the display year via grow records
- Display as BeanCard grid
- Season selector dropdown to switch years
- Loading/error/empty states

**Step 2: Verify with emulator**

**Step 3: Commit**

```bash
git add apps/web/src
git commit -m "feat: add homepage with current season bean display"
```

---

## Phase 9: Users Management

### Task 29: Users Page

**Files:**

- Create: `apps/web/src/pages/users/UsersPage.tsx` (replace stub)
- Create: `apps/web/src/components/users/UsersTable.tsx`

**Step 1: Create UsersTable**

Table with columns: display name, role (badge), created at. Admin can change role via inline select.

**Step 2: Assemble UsersPage**

- Breadcrumbs
- Admin-only page (redirect or show unauthorized message for non-admins)
- UsersTable
- Loading/error/empty states

**Step 3: Commit**

```bash
git add apps/web/src
git commit -m "feat: add users management page"
```

---

## Phase 10: Polish & Final Touches

### Task 30: Responsive Layout Polish

**Files:**

- Modify: `apps/web/src/components/layout/AppLayout.module.css`
- Modify: various component files as needed

**Step 1: Review and fix responsive behavior**

- Verify mobile-first approach across all pages
- Filter components: sidebar on large, horizontal on medium, collapsible on small
- Tables: horizontal scroll on small screens
- Cards: single column on mobile, multi-column on larger
- Navigation: hamburger menu on mobile

**Step 2: Test at various breakpoints**

**Step 3: Commit**

```bash
git add apps/web/src
git commit -m "fix: polish responsive layout across all pages"
```

---

### Task 31: Error Handling & Edge Cases

**Files:**

- Various files across the frontend

**Step 1: Add 404 route**

Add a catch-all route that shows a "Page not found" message.

**Step 2: Add auth guard for admin pages**

Protect bean edit, grow record edit, sources, and users pages. Redirect non-admins or show unauthorized state.

**Step 3: Handle deleted beans in listings**

Ensure soft-deleted beans (with `deletedAt`) are excluded from queries by default.

**Step 4: Commit**

```bash
git add apps/web/src
git commit -m "fix: add 404 page, auth guards, and soft-delete filtering"
```

---

### Task 32: Final Build & Cleanup

**Step 1: Run full build**

```bash
pnpm build
```

Fix any TypeScript errors.

**Step 2: Run formatter**

```bash
pnpm format
```

**Step 3: Run all tests**

```bash
pnpm test
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: final build verification and formatting cleanup"
```
