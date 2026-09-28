export type Destination = {
  id: string;
  city: string;
  country: string;
  airport: string;
  image: string;
  active: boolean;
};
export const destinations: Destination[] = [
  {
    id: "new-york",
    city: "New York",
    country: "United States",
    airport: "JFK",
    image: "/images/new-york.jpg",
    active: true,
  },
  {
    id: "london",
    city: "London",
    country: "United Kingdom",
    airport: "LHR",
    image: "/images/london.jpg",
    active: true,
  },
  {
    id: "dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    airport: "DXB",
    image: "/images/dubai.jpg",
    active: true,
  },
  {
    id: "paris",
    city: "Paris",
    country: "France",
    airport: "CDG",
    image: "/images/paris.jpg",
    active: true,
  },
  {
    id: "istanbul",
    city: "Istanbul",
    country: "Türkiye",
    airport: "IST",
    image: "/images/istanbul.jpg",
    active: true,
  },
];
export type Offer = {
  id: string;
  title: string;
  code: string;
  discount: number;
  active: boolean;
};
export const offers: Offer[] = [
  {
    id: "sky30",
    title: "Fly More, Save More",
    code: "SKY30",
    discount: 30,
    active: true,
  },
];
export const defaultSettings = {
  brand: "SkyVista",
  tagline: "Fly Beyond Boundaries",
  supportEmail: "",
  bookingEnabled: true,
};
export type Settings = typeof defaultSettings;
