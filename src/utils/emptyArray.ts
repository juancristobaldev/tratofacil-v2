// Referencia estable para usar como fallback de arrays vacíos en hooks de datos.
// Evita que `data?.field ?? []` cree una identidad nueva en cada render mientras
// `data` está undefined (loading), lo que puede disparar bucles de render en
// useMemo/useEffect que dependen de esos valores.
// Congelado en runtime para evitar mutaciones accidentales; tipado como `never[]`
// (no `readonly never[]`) para seguir siendo asignable a los tipos `T[]` mutables
// que declaran los hooks que la usan como fallback.
export const EMPTY_ARRAY: never[] = Object.freeze([]) as never[];
