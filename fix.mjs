import { promises as fs } from 'fs';

async function fix() {
    let content1 = await fs.readFile('src/lib/server/sessions/active-challenge-service.spec.ts', 'utf8');
    if (!content1.includes('createProfile')) {
        content1 = content1.replace(
            "import { createProfileRepositoryFake } from '$lib/server/test/fakes';",
            "import { createProfileRepositoryFake, createProfile } from '$lib/server/test/fakes';"
        );
    }
    await fs.writeFile('src/lib/server/sessions/active-challenge-service.spec.ts', content1);

    let content2 = await fs.readFile('src/lib/server/sessions/abandon-challenge-service.spec.ts', 'utf8');
    if (!content2.includes('createProfile')) {
        content2 = content2.replace(
            "import { createProfileRepositoryFake } from '$lib/server/test/fakes';",
            "import { createProfileRepositoryFake, createProfile } from '$lib/server/test/fakes';"
        );
    }
    content2 = content2.replace(/createProfileRepositoryFake\(\{ id: 'user-1' \}\)/g, "createProfileRepositoryFake(createProfile({ id: 'user-1' }))");
    await fs.writeFile('src/lib/server/sessions/abandon-challenge-service.spec.ts', content2);

    let content3 = await fs.readFile('src/routes/(app)/challenge/challenge-page.svelte.spec.ts', 'utf8');
    content3 = content3.replace(/activeChallenge: null/g, "activeChallenge: null as any");
    await fs.writeFile('src/routes/(app)/challenge/challenge-page.svelte.spec.ts', content3);

    let content4 = await fs.readFile('src/routes/demo/challenge-prep/+page.svelte', 'utf8');
    content4 = content4.replace(/activeChallenge: null/g, "activeChallenge: null as any");
    await fs.writeFile('src/routes/demo/challenge-prep/+page.svelte', content4);
}
fix().catch(console.error);
