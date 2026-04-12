export function buildLifecycleAliasMap(aliases: readonly string[]): Record<string, string> {
  return aliases.reduce<Record<string, string>>((accumulator, alias, index) => {
    accumulator[`alias_${index + 1}`] = alias;
    return accumulator;
  }, {});
}
