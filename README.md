# Paper CC

A research paper search and browsing platform for top AI/ML conferences and journals. Similar to [Paper Copilot](https://papercopilot.com).

**Live Demo**: https://ding2win.github.io/papercc/

## Features

- **Paper Search**: Search across arXiv or all venues (CVPR, ICCV, ECCV, NeurIPS, ICLR, etc.)
- **Conference/Journal Browsing**: Browse papers by venue with year filtering
- **Paper Details**: View abstract, authors, links to PDF, supplementary materials, and DOI
- **Reading List**: Save papers to a personal reading list (stored in localStorage)
- **Dark Mode**: Toggle between light and dark themes
- **AI-Powered Features** (powered by Groq API):
  - **AI Summary**: Auto-generate concise paper summaries
  - **Related Papers**: Get AI-recommended related papers
  - **AI Chat**: Ask questions about any paper

## Supported Venues

### Conferences
- CVPR (2020-2025)
- ICCV (2019, 2021, 2023, 2025)
- ECCV (2020, 2022, 2024)
- NeurIPS (2020-2024)
- ICLR (2020-2022)
- ICML, IROS, ICRA, AAAI

### Journals
- TPAMI, TIP, TMM, IJCV, TNNLS, TCSVT

## Tech Stack

- **Framework**: Next.js 14 (Static Export)
- **Styling**: Tailwind CSS with CSS Variables for theming
- **AI**: Groq API (Llama 3.1 8B Instant)
- **Deployment**: GitHub Pages
- **Data Source**: CVF OpenAccess, OpenReview, arXiv

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn

### Local Development

```bash
# Install dependencies
yarn install

# Start dev server
yarn dev

# Build for production
yarn build
```

### Environment Variables

Create a `.env.local` file for local AI features:

```
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```

Get a free API key at [console.groq.com](https://console.groq.com/keys).

For GitHub Pages deployment, add `GROQ_API_KEY` to your repository secrets.

## Project Structure

```
paper-copilot/
├── app/                        # Next.js app directory
│   ├── conferences/[venue]/   # Venue listing pages
│   ├── papers/                # Paper detail page
│   ├── reading-list/          # Saved papers page
│   └── page.tsx              # Home/search page
├── components/                # React components
│   ├── AIChat.tsx            # AI chat component
│   ├── AIRecommendations.tsx # Related papers
│   ├── AISummary.tsx         # AI summary
│   ├── SearchOverlay.tsx     # Search UI
│   ├── ThemeProvider.tsx    # Dark mode provider
│   └── ThemeToggle.tsx      # Theme toggle button
├── hooks/                     # React hooks
│   └── useReadingList.ts    # Reading list hook
├── lib/                       # Utilities
│   ├── ai.ts                 # Groq API client
│   ├── bibtex.ts             # BibTeX export
│   └── types.ts              # TypeScript types
├── public/
│   └── paperlists/          # Static paper JSON data
└── scripts/                  # Data fetching scripts
    ├── fetch-cvpr.js
    ├── fetch-iccv.js
    ├── fetch-eccv.js
    └── fetch-neurips.js
```

## Data Updating

Paper data is fetched from official sources and committed to the repository. To update:

1. Run the fetch scripts in `scripts/`:
   ```bash
   node scripts/fetch-cvpr.js
   node scripts/fetch-neurips.js
   # etc.
   ```

2. Rebuild the search index:
   ```bash
   yarn build:index
   ```

3. Commit and push changes.

## Deployment

The site auto-deploys to GitHub Pages on push to `main` via GitHub Actions. See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

The site is served at `/papercc` base path.

## License

MIT
