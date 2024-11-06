// types.d.ts

export interface Book {
  bookId: string;
  title: string;
  author: string;
  genre?: string;
  publishedDate?: string;  // Format: YYYY-MM-DD
  summary?: string;
}

export interface BookQueryParams {
  author?: string;
  genre?: string;
}
