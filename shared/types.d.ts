export interface Book {
  bookId: number;          // Sort key
  author: string;          // Partition key
  title: string;
  genre?: string;
  publishedYear?: number;  // Numeric attribute
  summary?: string;        // Longer text content suitable for Amazon Translate
  translatedSummaries?: {
    [languageCode: string]: string;  // Translated summaries for different languages
  };
  ownerId: string;          // User ID of the book owner which uses Cognito identity sub for the user so that the user is uniquely identified
}

// Interfaces for API Gateway
export interface BookQueryParams {
  author?: string;
  genre?: string;
}

// Interfaces for authentication
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
