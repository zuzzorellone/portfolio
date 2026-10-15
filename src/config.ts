export interface SiteConfig {
  /** Nome mostrato in header, titoli e footer */
  name: string;
  /** Brand secondario (firma accanto al nome); null per nasconderlo */
  brand: string | null;
  /** URL pubblico, senza slash finale */
  url: string;
  email: string;
  /** Partita IVA, obbligatoria nel footer se presente; null per nasconderla */
  vatId: string | null;
  /** Link opzionali: se null il relativo elemento non viene mostrato */
  links: {
    linkedin: string | null;
    github: string | null;
    booking: string | null;
  };
}

export const SITE: SiteConfig = {
  name: 'Christian Esposito',
  brand: 'Boarbyte',
  url: 'https://boarbyte.it',
  email: 'christian@boarbyte.it',
  vatId: null,
  links: {
    linkedin: 'https://www.linkedin.com/in/zuzzorellone/',
    github: 'https://github.com/zuzzorellone',
    booking: null,
  },
};

export const STACK = {
  work: ['Java', 'JSF', 'IBM FileNet', 'Oracle DB', 'WebLogic', 'Maven', 'SVN'],
  personal: ['Spring Boot', 'React', 'Docker', 'Git', 'nginx', 'Linux'],
} as const;
