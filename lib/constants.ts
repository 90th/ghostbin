export const LANGUAGE_OPTIONS = [
    { label: 'Plain Text', value: 'plaintext' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'JSON', value: 'json' },
    { label: 'Python', value: 'python' },
    { label: 'Java', value: 'java' },
    { label: 'HTML', value: 'html' },
    { label: 'CSS', value: 'css' },
    { label: 'Go', value: 'go' },
    { label: 'Rust', value: 'rust' },
    { label: 'SQL', value: 'sql' },
    { label: 'Bash', value: 'bash' },
    { label: 'C/C++', value: 'c' },
] as const;

export const EXPIRATION_OPTIONS = [
  { label: '1 Hour', value: 60 * 60 * 1000 },
  { label: '1 Day', value: 24 * 60 * 60 * 1000 },
  { label: '1 Week', value: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Never', value: 0 },
];

const VALID_LANGUAGES = new Set(LANGUAGE_OPTIONS.map(opt => opt.value));

export function isValidLanguage(lang: string): boolean {
    return VALID_LANGUAGES.has(lang);
}
