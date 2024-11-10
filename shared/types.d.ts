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

// New interfaces for authentication

export interface SignUpBody {
  username: string;
  password: string;
  email: string;
}

export interface SignInBody {
  username: string;
  password: string;
}

export interface ConfirmSignUpBody {
  username: string;
  code: string;
}
