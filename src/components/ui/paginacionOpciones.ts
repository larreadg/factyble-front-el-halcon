/**
 * Los tamaños de página que ofrece `Paginacion`.
 *
 * Vive fuera del componente por la misma razón que `buttonStyles` y
 * `inputStyles`: un archivo que exporta un componente y además una constante
 * rompe el fast refresh de Vite, y el linter lo marca. Acá lo leen tanto el
 * componente como los hooks que validan el parámetro de la URL.
 */
export const TAMANIOS_PAGINA = [10, 25, 50] as const
