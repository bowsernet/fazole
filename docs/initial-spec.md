# Bean Collecting App

Let's design a web app to track my bean collection.

## Tech stack

- frontend: vite, react, typescript, Mantine UI, react-router v7 (library mode — plain `<Routes>`/`<Route>`, no
  framework mode, no loaders/actions)
  - mantine additional packages: @mantine/notifications, @mantine/droipzone, @mentine/carousel
- backend and auth: firestore, cloud functions
- workspace: Turborepo monorepo
- formatting: Prettier with `@trivago/prettier-plugin-sort-imports` for import ordering
- use latest versions of all dependencies except for obvious conflicts
- typescript in strict mode
- path aliases (`@/package` for `packages/package/src`)
- pnpm package manager

### Prettier config

```json
{
  ...current config
  "importOrder": ["dotenv", "^react", "^vite", "@mantine", "<THIRD_PARTY_MODULES>", "@/", "^\\."],
  "importOrderSeparation": true,
  "importOrderSortSpecifiers": true,
  "plugins": ["@trivago/prettier-plugin-sort-imports"]
}
```

### Workspace structure

Apps:

- `apps/web` — the website (Vite + React)
- `apps/firebase-functions` — firebase backend (Cloud Functions)

Packages:

- `packages/common` — shared types and utilities used by both apps (e.g. entity types, constants, validation
  helpers)-clear
- `packages/config` — shared backend/frontend config and constants (also reexports some non-sensitive env variables for
  unified source of config)

No other libraries — keep it flat and simple. This is a small app; extracting more packages would be overkill.

### Firebase

- blaze plan will be used
- Latest stable node for runtime
- firebase functions v2 strictly
- region: closest to Czechia
- consistently use ints (unix epoch millisecond resolution) for date/time data instead of the native Timestamp type
  - both for 'date' and 'timestamp', this distinction is only for the frontend
  - for 'year', use int too but literally, not as epoch
- use latest modular version of firebase

Firestore security rules

- only admins can write
- everyone can read everything except
  - users: only self or admins can read

State management:

- use standard queries (not realtime/onSnapshot) - realtime functionality is not needed
- use standard firebase frontend SDK

## Setup before coding

1. Create a firebase project and setup a npm script to run the emulator suite in a local environment
2. Init Turborepo workspace and create the apps + common package

## Data structure/Entities

I'll describe entities loosely, for types I'll generally use typescript types. Please translate to firestore collections
and proper typescript interfaces/types. With this in mind:

- when the type looks like a typescript string union, make it one in typescript and make it a normal string in Firestore
- in parentheses, I'll sometimes provide the property description. Make use of it when building the app.

All entities should have `createdAt`, `updatedAt` columns. All properties are required except for when postfixed with
'?' (like in typescript)

Data integrity

- don't allow to delete documents that other documents depend on (beans that have growRecords, sources that have beans,
  etc.)
- unique attributes (rare) are speced in the entity description

### Users

We'll need additional data for users so let's have a custom `users` collection:

- role: 'admin' | 'user'
- displayName: string

### Beans

Tracks bean varieties.

Properties

- name: string
- species: 'vulgaris' | 'lima' | 'scarlet'
- podType: 'snap' | 'dry'
- plantType: 'bush' | 'semi' | 'runner'
- beansPerPod?: number (average beans per pod)
- beanSize?: number (average been size in mm)
- beanWeight?: number (average bean weight in mg)
- beanColor1?: primary color
- beanColor2?: secondary color
- beanColor3?: tertiary color
- sourceId: reference to source collection
- description?: string
- sourceDescription?: copy of description provided by source, if any
- yearsGrown: number[] (automatically updated each year the variety has been grown)
- deletedInSource?: boolean (if true, the bean has been deleted in the source)
- deletedAt?: date (soft delete timestamp)

Notes

- color attributes will have values from a predefined set of colors (since real world colors would be hard to model as
  RGB). Assume string union. Let's start with a simple list (white, yellow, brown, pink, red, purple, black) which I can
  amend later (directly in code, this is not in a database)

## Images

Bean images. Beans document subcollection.

Properties

- type: 'source' | 'closeup' | 'bunch' | 'seedling' | 'flower' | 'pod' | 'plant'
- year: number (year taken, mandatory. Can be used to display only images for the current season)
- primary: boolean (primary image of it's type; shown in lists and quick views)
- paths: object (key is size key, value is path in storage)
- urls: object (key is size key, value is url)

### GrowRecords

Tracking of which varieties has been grown in which year.

Properties

- year: number
- beanId: string (bean reference)
- preplantDate?: date (If seedlings were cultivated before planting to a final destination)
- plantDate?: date (when planted to the final destination)
- sproutDate?: date (when started to sprout)
- flowerDate?: date (when started to flower)
- harvestStartDate?: date (when first pods are dry and harvestable)
- harvestEndDate?: date (when last pods are harvested)
- deletedAt?: timestamp (soft delete timestamp)

### Sources

Tracks bean sources

Properties:

- name: string (unique)
- color: string (translates to mantine ui basic colors, like 'lime', 'grape' etc)
- link: string (url)
- description: string

## App structure

### Routing

```
  /                    → Homepage
  /beans               → Bean list
  /beans/:id           → Bean detail
  /beans/:id/edit      → Bean edit
  /beans/new           → Bean create
  /grow-records        → Grow records list
  /grow-records/:id/edit → Grow record edit
  /grow-records/new?beanId=xxx → New grow record (pre-filled bean)
  /seasons             → Seasons overview
  /sources             → Sources (modal CRUD, no separate page)
  /users               → Users management
```

### UI Components

This is a non-comprehensive list of notable UI components that will be used in the app.

- BeanCard (like a product card): image, name, pills (species, podType, plantType), years grown
  - use placeholder image when there's no image uploaded

### Page Layout

- navbar:
  - left: App Name
  - right:
    - menu (inline)
      - Beans, Seasons, Grow Records
      - Admin (when proper role) submenu
        - Sources, Users
    - user login component ("sign in" button when signed out, user name with a dropdown when signed in: Sign out)
- main content area
  - for listings: filter component -> list component (table/cards)
    - responsive layout
    - filter on the left rendered vertically for large screens
    - filter on the top rendered horizontally for mid screens
    - filter on the top collapsable and rendered horizontally for small screens
- footer (minimal, link to https://c0decafe.dev)

### General UX/UI principles

- Stateful data fetching for lists and details
  - loading: show spinner
  - error: show error message + retry button
  - empty: show empty state message
  - loaded: show data
- Pagination: use standard mantine pagination component, default settings
  - 50 per page fixed
- Responsive design
  - use flexbox unless layout is complex and requires grid
  - use mantine best practices
    - breakpoints via theme
    - for basic layout, use one single css module with media queries
    - for other components, prefer responsive props over custom css with media queries
      - `<Box w={{ base: 200, md: 400, lg: 600 }} />`
    - don't do variable component sizes per breakpoint
    - avoid exact pixel sizes except for basic layout
  - small set of breakpoints; mobile first
  - constraint width with a container pragmatically (~1200px)
- Toast notifications: use standard mantine notifications (needs custom npm package `@mantine/notifications` and
  MantineProvider)
- Use Breadcrumbs for each page
- Login flow
  - popup modal: Connect with Google
  - after login: Stay on the same page
- Deleting data
  - soft deletes for beans, grow records
    - undo notification (mantine toast), visible for 10 seconds
    - with deletedAt timestamp
  - hard deletes for other stuff but only if not referenced (is it possible with firebase?)
    - confirmation dialog

### Homepage

For the initial version, let's have a "Grown this year" (or "Grown last year" in January to June) section which simply
display all beans grown ini the current/last season as bean cards.

### Beans

Bean listing page.

- switch between tabular and card view
- the data shown is basically the same
- tabular view
  - sorting controls inside table headers
  - smaller image, use the 'closeup' type
- card view
  - BeanCard components
  - closeup type
- preview images falls back to source if the primary types are not available
- tabular view has the following properties in columns
  - name,
  - pod type
  - plant type,
  - bean size
  - bean color (one column cobining all three colors)
  - last year grown
- pagination
- leads to bean detail page
- default sort by name
- Add Bean button (only for admins),

### Bean Detail

- large image slider at the top
  - photos stacked horizontally, scrollable to sides
  - onclick, open full screen photo gallery (use mantine native if available or a good and simple slidebox component)
- Name and and all properties (pod type, plant type, etc.)
  - nicely visualized as little stats boxes or pills with tabler icons
  - description (if my own description is absent, use source description as fallback but mark it as such, i.e. make it
    different color background and put a little source name into the bottom right corner)
- Growing history
  - list of grow records as a table with all properties
  - no pagination as this will hardly reach more than 10 rows before I'm dead lol
  - no grow record detail page necessary
  - when admin, show edit/delete buttons
- Edit button (only for admins), takes you to the bean edit page
- Add Grow Record button (only for admins), takes you to the grow record edit page

### Bean Edit

Bean editing page. All bean document properties are editable plus all images should be editable at once (add/remove/edit
metadata). This is a full page form (not a modal).

Image management:

- use a well-known and minimal image picker/uploader library or native mantine component if available
- uploaded images
  - listed as table with a thumbnail
  - can be edited (set flags, edit metadata, reordering with drag&drop) and deleted
    - no update image function, delete instead
- accepted formats: jpeg, png, webp, avif
  - store as is, serve cached and optimized (webp/avif)
- max size not strictly enforced, fails on backend, just show error

### Seasons

A high level overview page that lists all seasons and the beans grown in that season

Table

- one row per year
- columns:
  - year (link to season detail page)
  - number of beans grown
  - list of beans grown with links to bean detail page
    - little inline cards: tiny image + name
- default sort by year descending

### Grow Records List

Lists all grow records, filterable and sortable by year and bean. Other attributes not sortable or filterable.

- sort by year descending
- pagination

### Grow Record Edit

Simple CRUD form for growing history item. All properties are editable. Images are not edited per grow record, only per
bean. This is a full page form (not a modal). Main reason is that it's accessible from different pages (bean detail,
grow records list).

### Sources

Management of the sources. Simple table with crud operations. Modal Form (no special edit page)

## Auth/Authorization, user cretation

- Let's utilize firebase architecture completely (no custom stuff). Google auth only.
- only admins can add/edit any kind of data in the initial version (in later versions, we might want to add some kind of
  crowdsourcing features but not now)
- Authorization should be handled with firestore security rules in `firestore.rules`, saved in the root of the project
  (and commited to git).
- First ever using the app is automatically an admin (deletable manually via firestore console if necessary)
  - other users all have 'user' role. Can be changed by admin later.
- `beforeUserCreated` function for creating the user document in firestore
- Auth state persistence: browserLocalPersistence
-

## Backend trigger functions

- update beans.yearsGrown on new growRecords

## User Stories

- As a user, I want to see a list of all beans that have grown in the current season. I wanna be able to select other
  seasons with a dropdown.
- As a user, I want to see a list of all beans in the database with advanced filtering options: species, pod type, plant
  type, year grown, color, source.
- As an admin, I want to be able to add new beans to the database (and also edit them)
- As an admin, I want to be able to manage the sources.
- As as user, I want to be able to sign in with google and also sign out.
- As an admin, I want to be able to add new grow records to the database (and also edit them)
- As an admin, I want to be able to manage the users.

## Other implementation details

### Forms

Use the `react-hook-form` library for forms and integrate it with the mantine UI components following best practices.

Forms will be either modal (for simple stuff like source editing) or full page (for more complicated forms like beans
edit). It's always mentioned in the context of the page which to use. They should both use the same component for the
actual form rendering, the difference is in the layout and in the handling of "after submit" (close modal vs. redirect
back to the list)

Full page forms will have three buttons

- cancel
- save and go back
- save and stay

Filters specifically:

- combine with AND
- default state is empty
- keep them simple, use single select filters unless instructed otherwise
- use autocomplete for specific sources
  - bean name filter when listing all grow records
- other references can use simple dropdowns

### Image handling

- store original images in Firebase Storage at `beans/${beanId}/images/${imageId}.{ext}`
- store image metadata in Firestore (subcollection of beans)
- custom Cloud Function (Storage `onFinalize` trigger) to generate optimized variants on upload using `sharp`:
  - size presets defined in a shared config (used by both backend and frontend), each with its own dimensions and resize
    mode — e.g. `card: 640x480 cover`, `full: 2048x2048 contain`
  - each preset is generated in both WebP and AVIF for browser compatibility
  - derivatives saved to Storage alongside the original; paths and URLs written back to the Firestore image document
    keyed by preset name and format
  - originals are kept as-is
- use a simple upload control for adding images — should integrate well with the form solution used for editing
- images displayed as thumbs (in cards, sliders, etc) can be enlarged with a simple lightbox component

### Code structuring inside a module

in the main `src` folder, let's have the following structure:

- `types` - typescript types
- `components` - react components
- `pages` - react pages
- `lib` - utility/library/helper functions. Loosely divided into different files by purpose.
- `hooks` - react hooks

Let's use a barrel file for each folder to export all components, pages, hooks, etc. We are not super concerned about
code splitting and build optimization, let's keep it simple and usable.

### React Components

Always use functional components with the traditional function syntax (for hooks too), not arrow functions (this applies
only to the component/hook functions, otherwise, lambdas are cool, specifically for short functions and callbacks).

### Authentication

Users authenticate with builtin firebase auth (google only). Anyone can register and login. The UI should be simple, we
don't need to distinguish between register and login (simply Connect with Google). All we need is one button pretty
much.

### Responsive design

Make sure the app is fully responsive and mobile first. It should a breeze with mantine UI.
