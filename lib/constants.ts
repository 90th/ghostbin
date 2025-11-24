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

const VALID_LANGUAGES = new Set(LANGUAGE_OPTIONS.map(opt => opt.value));

export function isValidLanguage(lang: string): boolean {
    return VALID_LANGUAGES.has(lang);
}
