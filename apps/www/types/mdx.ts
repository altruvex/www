import { SupportedLocales } from ".";

export interface ArticleFrontmatter {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
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
