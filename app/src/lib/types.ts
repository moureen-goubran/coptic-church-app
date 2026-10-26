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
// A one-off event (date set) or an "also offered" ministry (no date or time published).
export interface ChurchEvent {
  place_id: string; date: string | null; end_date: string | null; start: string | null; end: string | null; kind: string;
  title_en: string; title_ar: string | null; room_en: string | null; room_ar: string | null; last_verified: string | null;
}
export interface Details {
  place_id: string; email: string | null; parking_en: string | null; parking_ar: string | null;
  clergy_note_en: string | null; clergy_note_ar: string | null; logo: string | null; logo_dark: boolean; last_verified: string | null;
}
export interface Clergy { place_id: string; sort: number; name_en: string; name_ar: string | null; phone: string | null; email: string | null }
export interface Link { place_id: string; kind: string; url: string; label_en: string | null; label_ar: string | null }
export interface Dataset {
  generated: string; places: Place[]; services: Service[]; events: ChurchEvent[]; details: Details[]; clergy: Clergy[]; links: Link[]; source: "live" | "built-in";
}
