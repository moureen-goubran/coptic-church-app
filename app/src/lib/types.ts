export interface Place {
  id: string; name: string; name_ar: string | null; type: string;
  street: string | null; city: string; city_ar: string | null; state: string; zip: string | null; country: string;
  diocese: string | null; website: string | null; phone: string | null;
  lat: number | null; lng: number | null; location_approx: boolean; verification: string; last_verified: string | null;
}
export interface Service {
  place_id: string; day: number; start: string; end: string | null; kind: string;
  title_en: string; title_ar: string | null; room_en: string | null; room_ar: string | null; last_verified: string | null;
}
export interface Dataset { generated: string; places: Place[]; services: Service[]; source: "live" | "built-in" }
