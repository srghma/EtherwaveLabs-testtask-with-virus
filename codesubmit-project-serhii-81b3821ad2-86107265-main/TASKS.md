# Live Coding Exercise — Crypto Tracker (Full-Stack)



## Ground rules

- Share your entire screen for the duration of the exercise.
- Documentation and web search are fine, just like at work.
- [AI policy — Please do not use AI assistants during the exercise.]
- Stay with the project's stack: React + TypeScript on the frontend, Node + Express + MongoDB on the backend.
- You are not expected to finish everything. We care about how you think, how you communicate, and how you verify your work.

## What to run

| Folder      | Run?    | Command                           | Serves                        |
|-------------|---------|-----------------------------------|-------------------------------|
| `backend/`  | **Yes** | `npm install`, then `npm run dev` | API on http://localhost:5000  |
| `crypto/`   | **Yes** | `npm install`, then `npm run dev` | App on http://localhost:5173  |
| `server/`   | No      | —                                 | Price ticker (not used today) |
| `ml_model/` | No      | —                                 | Prediction service (not used) |

### Environment

`backend/.env`

```
MONGO_URI=[provided in your setup email]
JWT_SECRET=[provided in your setup email]
```

`crypto/.env`

```
VITE_API_URL=http://localhost:5000/api
[Firebase web config — the VITE_FIREBASE_* lines from your setup email]
```

The database is pre-seeded with a few blog posts and one account you can log in with:

- Email: `[interview account email]`
- Password: `[interview account password]`

### Where the exercise lives

All three tasks are in the **blog area** of the app: Register / Login, the blog list (the "Blogs" link), the post page, and the create-post page. Ignore the Coins, Watchlist, Prediction and Chat pages — they depend on external services and are out of scope.

### The API you will work against

Base URL: `http://localhost:5000/api`. Protected routes need an `Authorization: Bearer <token>` header; the token is returned by login. Frontend wrappers for every endpoint already exist in `crypto/src/api/blogApi.ts` and `crypto/src/api/authApi.ts`.

| Method & path                            | Auth   | Purpose                                                         |
|------------------------------------------|--------|-----------------------------------------------------------------|
| `POST /auth/register`, `POST /auth/login`| —      | Create an account / sign in; returns `{ _id, username, email, token }` |
| `GET /blogs`                             | —      | List posts                                                      |
| `GET /blogs/:id`                         | —      | One post                                                        |
| `POST /blogs`                            | Bearer | Create a post: `{ title, content, image? }`                     |
| `POST /blogs/:id/like`                   | Bearer | Like a post                                                     |
| `POST /blogs/:id/comment`                | Bearer | Comment on a post: `{ text }`                                   |

You can test endpoints directly with the browser's Network tab, a `fetch` in the console, or any REST client (curl, Postman, Thunder Client).

---

## Task 1 — Creating a post with an empty title breaks (≈ 10 min)

Log in and open the create-post page. Submit a post whose title is only spaces (or empty). Nothing stops the request, and the server answers with a generic error instead of telling the user what is wrong.

Fix it on both sides.

**Done when**

- [ ] A blank or whitespace-only title or content shows a clear message on the page, and no request is sent.
- [ ] The message goes away once the user starts typing again.
- [ ] Sending such a body straight to `POST /api/blogs` returns **400** with a JSON `{ message }`, not a 500.
- [ ] A valid post still saves and shows up in the list.

Start here: `crypto/src/pages/CreateBlog.tsx`, `crypto/src/api/blogApi.ts`, `backend/controllers/blogController.js`, `backend/routes/blogRoutes.js`.

**Hints** — open one at a time, only after you have been stuck for a few minutes. Using a hint is normal; we just note which ones you needed.

<details>
<summary>Hint 1</summary>

What happens right now if you submit with the title empty — on the page, and in the Network tab?

</details>

<details>
<summary>Hint 2</summary>

Where does the title get read on the page, and where does it arrive on the server?

</details>

<details>
<summary>Hint 3</summary>

Check the value before you send it, and check it again where it arrives — and think about which status code a bad request should get.

</details>

---

## Task 2 — Comments must actually save (≈ 15 min)

Open any post. The comments panel has a text box and a **Post** button, but posting does nothing: the text disappears and the comment is never saved.

Make it work end to end.

**Done when**

- [ ] A logged-in user posts a comment and it appears in the list immediately, with the author's username.
- [ ] After a page refresh, the comment is still there.
- [ ] A blank or whitespace-only comment is rejected on the page (message, no request) **and** by the server (`POST /api/blogs/:id/comment` returns **400**).
- [ ] A logged-out user cannot post. Handling the `401` gracefully is a plus.

Start here: `crypto/src/pages/BlogDetails.tsx`, `crypto/src/components/CommentSection.tsx`, `crypto/src/api/blogApi.ts`, `backend/controllers/blogController.js`, `backend/models/Blog.js`.

**Hints** — open one at a time, only after you have been stuck for a few minutes. Using a hint is normal; we just note which ones you needed.

<details>
<summary>Hint 1</summary>

Which part of the system needs to know about the new comment — the page, the server, or both?

</details>

<details>
<summary>Hint 2</summary>

Is there already a function in the frontend that talks to the comment endpoint? What does it need from you?

</details>

<details>
<summary>Hint 3</summary>

Call it with the post id and the token, and build the list you show from what the server sends back.

</details>

---

## Task 3 (bonus) — Like / un-like with a live count (≈ 10 min)

On the post page, add a **Like** button that shows how many likes the post has. Clicking it likes the post; clicking again removes your like.

**Done when**

- [ ] The button shows the current like count and whether *you* have liked the post.
- [ ] Clicking toggles the like, and the count shown comes from the server's response.
- [ ] After a page refresh, the count and your liked state are still correct.
- [ ] `POST /api/blogs/:id/like` for a post that does not exist returns **404**.
- [ ] The button cannot fire two requests at once. (Plus.)

Start here: `crypto/src/pages/BlogDetails.tsx`, `crypto/src/api/blogApi.ts`, `backend/controllers/blogController.js`.

**Hints** — open one at a time, only after you have been stuck for a few minutes. Using a hint is normal; we just note which ones you needed.

<details>
<summary>Hint 1</summary>

How does the server currently decide whether this user already liked the post, and what should happen in each case?

</details>

<details>
<summary>Hint 2</summary>

Those ids are database ObjectIds — will a plain `===` compare them the way you expect?

</details>

<details>
<summary>Hint 3</summary>

Find the user's id in the array, remove it if present or add it if not, save, and send back the count so the page can show it.

</details>

---

## What we pay attention to

- Both sides changed, and the API checked on its own — not only by clicking in the UI.
- Correct HTTP status codes and clear error messages.
- Edge cases: whitespace, missing data, unknown ids, failed requests.
- Readable code and immutable state updates in React.
- How you explain what you built, and what you would improve with more time.

Good luck — and talk us through it as you go.
