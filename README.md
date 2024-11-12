## Serverless REST Assignment - Distributed Systems.

**Name:** Killian Golds

**Demo:** Youtube API Demo URL supplied in assignment1.txt submission file.

### Context

My context is a serverless REST API for managing books. The main DynamoDB table stores information about books, using `bookId` and `author` as composite keys. The table includes:

- `bookId` (Number): Unique ID for each book.
- `author` (String): Name of the author (used as partition key).
- `title` (String): Title of the book.
- `genre` (String): Genre of the book.
- `publishedYear` (Number): Year the book was published.
- `summary` (String): Book description.
- `ownerId` (String): ID of the user who added the book.
- `translatedSummaries` (Object): Stores translations of the summary.

### App API Endpoints

- **POST /books**: Add a new book.
- **GET /books**: Get all books.
- **GET /books/by-author?author={author}**: Get all books by a specific author.
- **GET /books/{bookId}**: Get a specific book by `bookId`.
- **PUT /books/{bookId}**: Update a book (only allowed by the user who added it).
- **DELETE /books/{bookId}?author={author}**: Delete a book (only allowed by the user who added it).
- **GET /books/{bookId}/translation?language={languageCode}**: Get a translated summary of a book in the specified language. The translation is saved to avoid repeated requests.

### Update Constraint

Only the user who added a book can update it. Ownership is checked using the `ownerId` stored in DynamoDB. Each user has a unique ID, which is saved when a book is created. During an update request, the `ownerId` is compared to the authenticated user's ID to verify authorization.

### Translation Persistence

Translations are stored in the `translatedSummaries` attribute in DynamoDB. When a translation is requested, the system first checks if it already exists. If it does, the translation is returned directly, bypassing Amazon Translate. This reduces costs and improves efficiency by avoiding repeated translation requests.

### Extra

- **Lambda Layers:** A Lambda layer is used for the shared DynamoDB Document Client utility (`dbClient`). This layer speeds up updates and deployments by avoiding code duplication.
- **AWS Cognito Authoriser:** AWS Cognito is used for user authentication, providing secure sign-up, sign-in, and access to protected endpoints.
