/**
 * Distance à vol d'oiseau entre deux points GPS, en mètres (formule de Haversine).
 *
 * Suffisant pour décider d'une arrivée à destination: sur quelques centaines de
 * mètres, l'écart avec la distance réelle par la route est sans effet sur le
 * franchissement d'un seuil de proximité.
 */
export const distanceEnMetres = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371000; // rayon terrestre en mètres
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
