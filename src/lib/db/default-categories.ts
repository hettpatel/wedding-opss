/** The ten standard categories, with the words the parser uses to classify a sentence. */
export interface DefaultCategoryDefinition {
  name: string;
  keywords: string[];
}

export const DEFAULT_CATEGORIES: DefaultCategoryDefinition[] = [
  {
    name: 'Rituals & Puja',
    keywords: [
      'puja', 'pooja', 'pandit', 'panditji', 'samagri', 'ritual', 'ganesh', 'muhurat',
      'mandap muhurat', 'havan', 'mataji', 'temple', 'mandir', 'vidhi', 'garba',
    ],
  },
  {
    name: 'Catering & Menu',
    keywords: [
      'food', 'caterer', 'catering', 'menu', 'sweet', 'mithai', 'breakfast', 'lunch',
      'dinner', 'snacks', 'rasoi', 'cook', 'maharaj', 'water', 'thali', 'plates',
    ],
  },
  {
    name: 'Venue & Decor',
    keywords: [
      'decor', 'decoration', 'decorator', 'stage', 'flower', 'lighting', 'light',
      'mandap', 'tent', 'venue', 'hall', 'chairs', 'sound', 'dj', 'rangoli',
    ],
  },
  {
    name: 'Guest Accommodation',
    keywords: ['room', 'rooms', 'hotel', 'stay', 'accommodation', 'mattress', 'bedding', 'guest house', 'dharamshala'],
  },
  {
    name: 'Mameru Gifts',
    keywords: ['mameru', 'gift', 'gifts', 'box', 'boxes', 'packing', 'hamper', 'saree', 'chundadi', 'shagun'],
  },
  {
    name: 'Transport & Vehicles',
    keywords: ['bus', 'buses', 'car', 'cars', 'driver', 'pickup', 'drop', 'transport', 'vehicle', 'tempo', 'traveller', 'petrol', 'diesel'],
  },
  {
    name: 'Photography & Media',
    keywords: ['photographer', 'photography', 'video', 'videographer', 'photo', 'drone', 'album', 'reel', 'shoot', 'camera', 'led screen'],
  },
  {
    name: 'Invitations & Communication',
    keywords: ['invitation', 'invite', 'card', 'cards', 'whatsapp', 'guest', 'guests', 'message', 'call', 'kankotri', 'rsvp', 'list'],
  },
  {
    name: 'Finance & Payments',
    keywords: ['payment', 'pay', 'advance', 'balance', 'budget', 'expense', 'receipt', 'bill', 'cash', 'upi', 'cheque', 'token'],
  },
  { name: 'Miscellaneous', keywords: [] },
];
