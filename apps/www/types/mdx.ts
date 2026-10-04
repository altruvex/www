import { SupportedLocales } from ".";

export interface ArticleFrontmatter {
  title: string;
  excerpt: string;
  date: string;
  readTimeMinutes: number;
  author: string;
  tags: string[];
  coverImage?: string;
  featured?: boolean;
  topic: ArticleTopic;
  locale: SupportedLocales;
}

export type ArticleTopic = "choose" | "build";

export interface Article {
  slug: string;
  frontmatter: ArticleFrontmatter;
  content: string;
  headings: string[];
  locale: SupportedLocales;
}

export interface ArticleListItem {
  slug: string;
  frontmatter: ArticleFrontmatter;
  headings: string[];
}
