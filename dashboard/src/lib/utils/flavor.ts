
export const AGENT_FLAVOR = {
    'dev-alpha': {
        names: ['Neo', 'Trinity', 'Morpheus', 'Cipher', 'Tank'],
        titles: ['Code Prophet', 'Matrix Architect', 'Operator', 'Reality Bender'],
        avatar: '👨‍💻'
    },
    'dev-beta': {
        names: ['Crash', 'Burn', 'Zero', 'Cool', 'Acid'],
        titles: ['Bug Hunter', 'Script Kiddie', 'Stack Overflow Copy-Paster', 'Legacy Code Archaeologist'],
        avatar: '👩‍💻'
    },
    'dev-gamma': {
        names: ['Gamma Ray', 'Hulk', 'Bruce', 'Smash', 'Green'],
        titles: ['Brute Force Specialist', 'Refactor Reactor', 'Test Smasher', 'Green Build Enforcer'],
        avatar: '🧟'
    },
    'tech-lead': {
        names: ['The Architect', 'Gandalf', 'Yoda', 'Obi-Wan', 'Dumbledore'],
        titles: ['Grand Wizard', 'Senior Syntax Sorcerer', 'Meeting Avoider', 'Visionary (allegedly)'],
        avatar: '🧙‍♂️'
    },
    'product-owner': {
        names: ['Boss Man', 'Big Cheese', 'The Suit', 'Vision', 'Moneybags'],
        titles: ['Feature Creeper', 'Deadline Setter', 'Scope Expander', 'Pivot Master'],
        avatar: '🕴️'
    },
    'qa': {
        names: ['Sherlock', 'Watson', 'Poirot', 'Columbo', 'Monk'],
        titles: ['Bug Detective', 'Release Blocker', 'Pixel Peeper', 'Crash Test Dummy'],
        avatar: '🕵️'
    },
    'reviewer': {
        names: ['Judge Dredd', 'The Eye', 'Sauron', 'Big Brother', 'Critic'],
        titles: ['Code Critic', 'Nitpicker General', 'Style Guide Enforcer', 'Gatekeeper'],
        avatar: '⚖️'
    },
    'devops': {
        names: ['Root', 'Sudo', 'Admin', 'Daemon', 'Server'],
        titles: ['Pipeline Plumber', 'Cloud Herder', 'Downtime Causer', 'YAML Wrangler'],
        avatar: '🏗️'
    }
};

export const COMPANY_EVENTS = [
    "Coffee machine requires a firmware update.",
    "Deploying to production on a Friday...",
    "Someone unplugged the server to vacuum.",
    "AI is becoming self-aware (again).",
    "Merge conflict in documentation.md.",
    "Buying more RAM...",
    "Refactoring the refactor.",
    "Scheduling a meeting to plan the meeting.",
    "Dark mode enabled for maximum productivity.",
    "Compiling...",
    "Downloading the internet...",
    "Fixing a bug by creating two more.",
    "Works on my machine!",
    "Searching for the missing semicolon.",
    "Quantum entanglement in the git history.",
    "Pizza has arrived.",
    "Server room temperature critical (someone opened a window).",
    "Updating npm packages... see you next week.",
    "Pushing straight to main...",
    "Deleting production database... oops."
];

export function getRandomFlavor(role: string) {
    const flavor = AGENT_FLAVOR[role as keyof typeof AGENT_FLAVOR] || { names: ['Agent'], titles: ['Unknown'], avatar: '👤' };
    const name = flavor.names[Math.floor(Math.random() * flavor.names.length)];
    const title = flavor.titles[Math.floor(Math.random() * flavor.titles.length)];
    return { name, title, avatar: flavor.avatar };
}

export function getRandomEvent() {
    return COMPANY_EVENTS[Math.floor(Math.random() * COMPANY_EVENTS.length)];
}
