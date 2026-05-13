export type TechnologySeed = {
  slug: string;
  canonicalName: string;
  kind: string;
  ecosystem?: string;
  description?: string;
  homepageUrl?: string;
  repositoryUrl?: string;
  license?: string;
  latestVersion?: string;
  source: string;
  aliases?: string[];
  versions?: string[];
  metadata?: Record<string, unknown>;
};

export const TECHNOLOGY_SEED: TechnologySeed[] = [
  {
    slug: 'javascript',
    canonicalName: 'JavaScript',
    kind: 'language',
    ecosystem: 'github_linguist',
    source: 'seed',
    aliases: ['js', 'ecmascript'],
  },
  {
    slug: 'typescript',
    canonicalName: 'TypeScript',
    kind: 'language',
    ecosystem: 'github_linguist',
    source: 'seed',
    aliases: ['ts'],
  },
  { slug: 'python', canonicalName: 'Python', kind: 'language', ecosystem: 'github_linguist', source: 'seed', aliases: ['py'] },
  { slug: 'php', canonicalName: 'PHP', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'java', canonicalName: 'Java', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'csharp', canonicalName: 'C#', kind: 'language', ecosystem: 'github_linguist', source: 'seed', aliases: ['c#', 'cs'] },
  { slug: 'go', canonicalName: 'Go', kind: 'language', ecosystem: 'github_linguist', source: 'seed', aliases: ['golang'] },
  { slug: 'rust', canonicalName: 'Rust', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'ruby', canonicalName: 'Ruby', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'kotlin', canonicalName: 'Kotlin', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'swift', canonicalName: 'Swift', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'dart', canonicalName: 'Dart', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'sql', canonicalName: 'SQL', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'html', canonicalName: 'HTML', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'css', canonicalName: 'CSS', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'xml', canonicalName: 'XML', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'json', canonicalName: 'JSON', kind: 'language', ecosystem: 'github_linguist', source: 'seed' },
  { slug: 'yaml', canonicalName: 'YAML', kind: 'language', ecosystem: 'github_linguist', source: 'seed', aliases: ['yml'] },
  {
    slug: 'nodejs',
    canonicalName: 'Node.js',
    kind: 'runtime',
    ecosystem: 'npm',
    source: 'seed',
    aliases: ['node'],
    versions: ['18', '20', '22', '24'],
  },
  {
    slug: 'nestjs',
    canonicalName: 'NestJS',
    kind: 'framework',
    ecosystem: 'npm',
    source: 'seed',
    aliases: ['nest'],
    versions: ['9', '10', '11'],
    repositoryUrl: 'https://github.com/nestjs/nest',
  },
  {
    slug: 'angular',
    canonicalName: 'Angular',
    kind: 'framework',
    ecosystem: 'npm',
    source: 'seed',
    versions: ['17', '18', '19', '20', '21'],
    repositoryUrl: 'https://github.com/angular/angular',
  },
  { slug: 'react', canonicalName: 'React', kind: 'library', ecosystem: 'npm', source: 'seed', versions: ['18', '19'], repositoryUrl: 'https://github.com/facebook/react' },
  { slug: 'nextjs', canonicalName: 'Next.js', kind: 'framework', ecosystem: 'npm', source: 'seed', aliases: ['next'], versions: ['13', '14', '15'], repositoryUrl: 'https://github.com/vercel/next.js' },
  { slug: 'vue', canonicalName: 'Vue', kind: 'framework', ecosystem: 'npm', source: 'seed', aliases: ['vuejs'], versions: ['2', '3'], repositoryUrl: 'https://github.com/vuejs/core' },
  { slug: 'nuxt', canonicalName: 'Nuxt', kind: 'framework', ecosystem: 'npm', source: 'seed', versions: ['3', '4'] },
  { slug: 'express', canonicalName: 'Express', kind: 'framework', ecosystem: 'npm', source: 'seed', versions: ['4', '5'] },
  { slug: 'fastify', canonicalName: 'Fastify', kind: 'framework', ecosystem: 'npm', source: 'seed', versions: ['4', '5'] },
  { slug: 'django', canonicalName: 'Django', kind: 'framework', ecosystem: 'pypi', source: 'seed', versions: ['3.2', '4.2', '5.0', '5.1', '5.2'] },
  { slug: 'flask', canonicalName: 'Flask', kind: 'framework', ecosystem: 'pypi', source: 'seed', versions: ['2', '3'] },
  { slug: 'fastapi', canonicalName: 'FastAPI', kind: 'framework', ecosystem: 'pypi', source: 'seed' },
  { slug: 'laravel', canonicalName: 'Laravel', kind: 'framework', ecosystem: 'packagist', source: 'seed', versions: ['10', '11', '12'] },
  { slug: 'symfony', canonicalName: 'Symfony', kind: 'framework', ecosystem: 'packagist', source: 'seed', versions: ['6.4', '7.0', '7.1'] },
  { slug: 'spring-boot', canonicalName: 'Spring Boot', kind: 'framework', ecosystem: 'maven', source: 'seed', aliases: ['springboot'], versions: ['2.7', '3.2', '3.3', '3.4'] },
  { slug: 'dotnet', canonicalName: '.NET', kind: 'framework', ecosystem: 'nuget', source: 'seed', aliases: ['.net', 'aspnet'], versions: ['6', '7', '8', '9'] },
  { slug: 'ruby-on-rails', canonicalName: 'Ruby on Rails', kind: 'framework', ecosystem: 'rubygems', source: 'seed', aliases: ['rails'], versions: ['6', '7', '8'] },
  { slug: 'flutter', canonicalName: 'Flutter', kind: 'framework', ecosystem: 'pub', source: 'seed' },
  { slug: 'odoo', canonicalName: 'Odoo', kind: 'framework', ecosystem: 'custom', source: 'seed', versions: ['14', '15', '16', '17', '18', '19'] },
  { slug: 'postgresql', canonicalName: 'PostgreSQL', kind: 'database', ecosystem: 'custom', source: 'seed', aliases: ['postgres'], versions: ['14', '15', '16', '17', '18'] },
  { slug: 'mysql', canonicalName: 'MySQL', kind: 'database', ecosystem: 'custom', source: 'seed', versions: ['8', '9'] },
  { slug: 'mariadb', canonicalName: 'MariaDB', kind: 'database', ecosystem: 'custom', source: 'seed', versions: ['10', '11'] },
  { slug: 'mongodb', canonicalName: 'MongoDB', kind: 'database', ecosystem: 'custom', source: 'seed', versions: ['6', '7', '8'] },
  { slug: 'redis', canonicalName: 'Redis', kind: 'database', ecosystem: 'custom', source: 'seed', versions: ['6', '7', '8'] },
  { slug: 'npm', canonicalName: 'npm', kind: 'package_manager', ecosystem: 'npm', source: 'seed' },
  { slug: 'pnpm', canonicalName: 'pnpm', kind: 'package_manager', ecosystem: 'npm', source: 'seed' },
  { slug: 'yarn', canonicalName: 'Yarn', kind: 'package_manager', ecosystem: 'npm', source: 'seed' },
  { slug: 'pip', canonicalName: 'pip', kind: 'package_manager', ecosystem: 'pypi', source: 'seed' },
  { slug: 'poetry', canonicalName: 'Poetry', kind: 'package_manager', ecosystem: 'pypi', source: 'seed' },
  { slug: 'maven', canonicalName: 'Maven', kind: 'build_tool', ecosystem: 'maven', source: 'seed' },
  { slug: 'gradle', canonicalName: 'Gradle', kind: 'build_tool', ecosystem: 'maven', source: 'seed' },
  { slug: 'vite', canonicalName: 'Vite', kind: 'build_tool', ecosystem: 'npm', source: 'seed' },
  { slug: 'webpack', canonicalName: 'webpack', kind: 'build_tool', ecosystem: 'npm', source: 'seed' },
  { slug: 'jest', canonicalName: 'Jest', kind: 'test_tool', ecosystem: 'npm', source: 'seed' },
  { slug: 'vitest', canonicalName: 'Vitest', kind: 'test_tool', ecosystem: 'npm', source: 'seed' },
  { slug: 'pytest', canonicalName: 'pytest', kind: 'test_tool', ecosystem: 'pypi', source: 'seed' },
];
