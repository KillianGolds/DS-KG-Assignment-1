// types.d.ts
export interface Book {
  bookId: number;          // Sort key
  author: string;          // Partition key
  title: string;
  genre?: string;
  publishedYear?: number;  // Numeric attribute
  summary?: string;        // Longer text content suitable for Amazon Translate when i get to that stage
}

export interface BookQueryParams {
  author?: string;
  genre?: string;
}
