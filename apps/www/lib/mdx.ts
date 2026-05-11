import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import type { Article, ArticleFrontmatter, ArticleListItem } from "@/types/mdx";

const articlesDirectory = path.join(process.cwd(), "contents/articles");

function getArticleSlugs(locale: "en" | "ar"): string[] {
  const localeDir = path.join(articlesDirectory, locale);

  if (!fs.existsSync(localeDir)) {
    return [];
  }

  const files = fs.readdirSync(localeDir);
  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export const getArticle = cache(
  async (slug: string, locale: "en" | "ar"): Promise<Article | null> => {
    try {
      const filePath = path.join(articlesDirectory, locale, `${slug}.mdx`);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(fileContents);

      const wordsPerMinute = 200;
      const wordCount = content.split(/\s+/).length;
      const readTime = Math.ceil(wordCount / wordsPerMinute);

      return {
        slug,
        frontmatter: {
          ...data,
          readTime: `${readTime} min read`,
          locale,
        } as ArticleFrontmatter,
        content,
        locale,
      };
    } catch (error) {
      console.error(`Error reading article ${slug}:`, error);
      return null;
    }
  },
);

export const getAllArticles = cache(
  async (locale: "en" | "ar"): Promise<ArticleListItem[]> => {
    const slugs = getArticleSlugs(locale);

    const articles = await Promise.all(
      slugs.map(async (slug) => {
        const article = await getArticle(slug, locale);
        if (!article) return null;

        return {
          slug,
          frontmatter: article.frontmatter,
        };
      }),
    );

    return articles
      .filter((article): article is ArticleListItem => article !== null)
      .sort((a, b) => {
        const dateA = new Date(a.frontmatter.date).getTime();
        const dateB = new Date(b.frontmatter.date).getTime();
        return dateB - dateA;
      });
  },
);

export async function getRelatedArticles(
  currentSlug: string,
  tags: string[],
  locale: "en" | "ar",
  limit = 3,
): Promise<ArticleListItem[]> {
  const allArticles = await getAllArticles(locale);

  return allArticles
    .filter((article) => article.slug !== currentSlug)
    .map((article) => {
      const commonTags = article.frontmatter.tags.filter((tag) =>
        tags.includes(tag),
      );
      return { article, score: commonTags.length };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ article }) => article);
}
