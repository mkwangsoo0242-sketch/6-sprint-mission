## Freeboard Articles API

Simple Express + SQLite API for Articles.

### Article Schema

- id: integer (PK, autoincrement)
- title: text (required)
- content: text (required)
- createdAt: ISO string (UTC)
- updatedAt: ISO string (UTC)

### Getting Started

1. Install
   ```bash
   npm install
   ```
2. Run
   ```bash
   npm run dev
   # or
   npm start
   ```
3. Health check
   ```bash
   curl http://localhost:3000/health
   ```

### APIs

- Create Article

  ```bash
  curl -X POST http://localhost:3000/articles \
    -H 'Content-Type: application/json' \
    -d '{"title":"Hello","content":"World"}'
  # => { "id": 1 }
  ```

- Get Article Detail

  ```bash
  curl http://localhost:3000/articles/1
  # => { "id":1, "title":"Hello", "content":"World", "createdAt":"..." }
  ```

- Update Article

  ```bash
  curl -X PUT http://localhost:3000/articles/1 \
    -H 'Content-Type: application/json' \
    -d '{"title":"New Title"}'
  # => { "id":1, "updated": true }
  ```

- Delete Article

  ```bash
  curl -X DELETE http://localhost:3000/articles/1 -i
  # => 204 No Content
  ```

- List Articles (pagination, recent sort, search by title/content)

  ```bash
  # default recent sort, offset=0, limit=20
  curl 'http://localhost:3000/articles'

  # with pagination
  curl 'http://localhost:3000/articles?offset=20&limit=10'

  # with search
  curl 'http://localhost:3000/articles?query=hello'

  # with explicit sort=recent (the only supported sort)
  curl 'http://localhost:3000/articles?sort=recent'
  ```

Response:

```json
{
  "items": [{ "id": 2, "title": "T", "content": "C", "createdAt": "..." }],
  "total": 42,
  "offset": 0,
  "limit": 20
}
```
