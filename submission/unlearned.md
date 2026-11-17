# Unlearned

Five things I believed before this week, and what replaced them.

## 1. "Write the code, then the docs." → The spec is the code's source.

I used to treat a spec as a plan I would drift away from. Here, `directive.md` was what the AI agent built from. When
the output was wrong, I fixed the directive first and regenerated, and wrote down why. It went from v1 to v5.9 in five
days. The changelog now tells the story of every decision better than my commit messages do.

## 2. "If the AI's answer sounds right, it probably is." → Ask for the evidence.

From Day 1 I asked Claude and ChatGPT the same questions side by side, like two colleagues, and they did not
always agree. That habit paid off later: when the real AI calls started failing, the agent confidently blamed reused import IDs. The logs said something else:
a dead keep-alive connection failed after 27 ms. Another time it kept a copy of the model list in a database table I
had said not to create. The agent is fast and fluent, and that is exactly why I now ask "what in the logs or tests
shows this?" before I accept a cause or a design.

## 3. "To be safe, throw the whole answer away when something is wrong." → Fail small.

My first guardrail dropped the whole AI answer when any check failed. One date in one message threw away every good
message, and recruiters saw only templates. Now each part is checked on its own and only the bad part falls back. Safe
does not have to mean all-or-nothing.

## 4. "More AI calls make better, more personal messages." → One good call, used well.

Writing a message per row would cost more with every row and get slower. One call that writes one message per action,
with placeholders filled per row, gives all 500 rows of a board an AI message for the price of one small call, and
the AI never sees a name.

## 5. "The plan is the plan." → The cut order matters more than the day plan.

My day plan said frontend on Day 3. The backend took all of Day 3, and the frontend moved to Day 4. What kept the
week on track was the written cut order (P2, then P1, then polish) and the list of things never to cut: the rules,
the tests, the guardrails, the fallback and the export.

## What I will keep doing

Spec first, small reviewable steps, a fresh session with a different model to verify each finished feature, a
review that runs the app and not only reads it, and a human (me) who commits every change.
