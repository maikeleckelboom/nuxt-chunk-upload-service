export function matches<T>(value: T, ...matches: T[]): boolean {
    return matches.includes(value);
}