import type { TemplateSnapshot } from "@/db/schema/types";

export type PlazaCategoryDTO = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  templateCount: number;
};

export type AdminPlazaCategoryDTO = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  /** 与公开端 templateCount 同口径：已发布且未归档、未删除 */
  publicTemplateCount: number;
  /** 全部未软删除投稿，删除分类时会变成未分类 */
  totalTemplateCount: number;
};

export type PlazaAuthorDTO = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type PlazaStatus =
  "draft" | "pending" | "published" | "rejected" | "archived";

export type PlazaTemplateCardDTO = {
  id: string;
  title: string;
  summary: string | null;
  coverUrl: string | null;
  category: { id: string; slug: string; name: string } | null;
  tags: string[];
  author: PlazaAuthorDTO;
  isOfficial: boolean;
  featured: boolean;
  status: PlazaStatus;
  published: boolean;
  cloneCount: number;
  likeCount: number;
  viewCount: number;
  ratingAvg: number;
  ratingCount: number;
  publishedAt: string | null;
  updatedAt: string;
  liked: boolean;
  favorited: boolean;
};

export type PlazaReviewDTO = {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  author: PlazaAuthorDTO;
  mine: boolean;
};

export type PlazaTemplateDetailDTO = PlazaTemplateCardDTO & {
  snapshot: TemplateSnapshot | null;
  version: number | null;
  changelog: string | null;
  rejectReason: string | null;
  reviews: PlazaReviewDTO[];
  myReview: PlazaReviewDTO | null;
};

export type PlazaSubmissionDTO = {
  id: string;
  title: string;
  summary: string | null;
  status: PlazaStatus;
  rejectReason: string | null;
  isOfficial: boolean;
  featured: boolean;
  category: { id: string; slug: string; name: string } | null;
  tags: string[];
  cloneCount: number;
  likeCount: number;
  viewCount: number;
  ratingAvg: number;
  ratingCount: number;
  latestVersion: number | null;
  publishedVersion: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
  coverUrl: string | null;
};

export type AdminPlazaSubmissionDTO = PlazaSubmissionDTO & {
  author: PlazaAuthorDTO;
  snapshot: TemplateSnapshot | null;
  changelog: string | null;
  published: boolean;
};
