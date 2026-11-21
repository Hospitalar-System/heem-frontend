/** "1 ordem", "4 ordens": concorda o substantivo com a quantidade (sem "ordem(ns)"). */
export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}
