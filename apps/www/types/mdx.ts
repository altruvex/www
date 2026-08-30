import { SupportedLocales } from ".";

export interface ArticleFrontmatter {
  title: string;
  excerpt: string;
  date: string;
  /** Estimated reading time in whole minutes. Formatted at render so the
   *  phrase and the numerals follow the reading locale. */
  readTimeMinutes: number;
  author: string;
  tags: string[];
  coverImage?: string;
  featured?: boolean;
  locale: SupportedLocales;
}

export interface Article {
  slug: string;
  frontmatter: ArticleFrontmatter;
  content: string;
  locale: SupportedLocales;
}

export interface ArticleListItem {
  slug: string;
  frontmatter: ArticleFrontmatter;
}
