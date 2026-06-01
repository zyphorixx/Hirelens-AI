This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Architecture Overview

Frontend:
- Next.js 16
- React
- Tailwind CSS

Backend:
- Next.js API Routes

Database:
- PostgreSQL (Neon)

ORM:
- Prisma

AI:
- Gemini 2.5 Flash

Workflow:
1. Create Job Description
2. Upload resumes
3. Extract resume text
4. Parse candidate details
5. Screen candidates with Gemini
6. Rank candidates by score
7. Search, sort and export CSV

## Candidate Scoring Approach

The system uses Gemini 2.5 Flash to compare resumes against the Job Description.

Evaluation factors:
- Skill match
- Missing skills
- Experience relevance
- Education relevance
- Keyword overlap

Generated outputs:
- Score (0-100)
- Matching skills
- Missing skills
- Candidate summary

Candidates are ranked in descending order of score.