# U5 — Central AI Tutorial Prompt Studio

Status: isolated implementation on merged U4/U3 (main `5e889ac`, including PR #77). Live activation remains disabled. There are no AI API calls, paid services, email sends, new database migrations or production settings changes.

## Review workflow

Serve the repository and open `/platform/admin/preview.html`:

1. Select **Sample learner**. Under **Professional profile**, apply the import-export beginner template and save if you want to review personalized output.
2. Open **Tutorial prompts**. Choose the study section, teaching template, topic, learning objective, difficulty, exercise count, material type and professional scenario. Add optional requirements.
3. Select **Generate prompt**. Review the generated text for accuracy and privacy. To revise it, change the inputs/profile and regenerate.
4. Confirm that you reviewed the prompt, then **Copy prompt**. Paste manually into the external AI tool of your choice. If copying is unavailable, **Select prompt text** lets you use the device's Copy command.
5. Keep generated material as a draft for review. U6 will provide importing, validation, publishing and assignment; U5 does not claim to have imported or created files.

The preview uses synthetic in-memory records and never contacts Supabase. In the eventual activated Admin Studio, saved learner data is read through the existing administrator-only U3 endpoint. The selected learner appears in the editor but their name/email/UUID are not intentionally included in generated prompts. Use the main People list to select another learner; switching away from edited inputs asks before discarding the draft.

## Template and material coverage

Three reusable teaching structures are included: Explain → demonstrate → practise, a task from the learner's workday, and common mistakes/correction. Each combines with subject-specific guidance for Excel, VBA, Python, SQL, C/C++, BAT, HTML/CSS/JavaScript and AI Study, plus Mechanical, Mathematics and Language Study families. Unsupported sections fail rather than silently receiving an unrelated template. The section selector shows supported study leaves already granted to the selected learner; prompts never add grants.

Material types: in-app study examples, concept explanations, guided exercises, independent practice, quizzes, downloadable tutorial files, answer sheets and practical projects. Each has an output brief. Exercise count is an integer from 1–30. Topic/objective/scenario text is limited to 2,000 characters each; additional requirements to 4,000. Profiles are validated through U3's schema. Templates are reusable built-ins with `templateVersion: 1`; custom template editing/persistence and optional history are not included in this increment.

Excel guidance reflects merged Phase A: manual `=SUM(B2:B4)` in B5, with Ribbon operations still previews. External desktop-Excel tasks are distinguished from supported in-app steps. Downloadable-file prompts request macro-free XLSX and separate practice/solution sheets; if the external model cannot create a real file, it must provide construction steps rather than invent a download link. Answer-sheet prompts request missing exercise text/data rather than fabricating solutions to unseen tasks. U4's core-concept/scenario/dataset separation is maintained, but U5 does not promise a universal import format for material types whose schemas are not yet implemented.

## Authorization and privacy boundary

- The live tab is available only inside the U2 administrator interface. Opening the tab, generating and using the Copy button each call `api.profile`, which verifies sign-in online and invokes U3's administrator-only `cp_admin_profile`. Learners cannot fetch another person's profile by opening the route or calling that RPC.
- The generator is a pure data transformation with no network or storage access. Its static code/templates are public, as is the synthetic preview; the authorization boundary protects actual learner information and administrative operations, not secrecy of JavaScript.
- Generation uses a fresh profile. Copy checks its revision again and clears a stale prompt if the profile changed. Auth invalidation/offline handling disposes the entire editor and ignores late responses. Browser clipboard contents already copied cannot be recalled.
- Only allowlisted learning-profile fields enter the generator. No membership/auth/session envelope is accepted. The selected learner's known display name, email and UUID are supplied only to the removal filter, never appended as metadata.
- Recognizable email addresses, UUIDs, HTTP(S) links, Supabase-style keys, JWT-like strings and OpenAI-style keys are removed from all free-text inputs/profile fields. This is defensive filtering, **not guaranteed anonymization or secret detection**. Names not matching the selected identity, phone numbers, employer/customer details, uncommon credentials and indirect identifiers can remain. Human review is required before external sharing.
- The review checkbox gates the Copy button. Text selection remains available for review/manual copying; this is not a DRM boundary and cannot prevent users copying visible text through browser/OS controls. Clipboard API behavior depends on HTTPS, browser permissions and user gestures; fallback messaging is explicit and never claims a failed copy succeeded.
- Generated prompt/profile data is held only in memory. No localStorage, service-worker cache, database history, telemetry or automatic upload is added. Templates do not override permissions, create assignments, execute imported scripts or publish AI output. Free-text content remains untrusted.

No actual learner email was supplied or created. No external AI product is invoked by this phase. The user manually decides where to paste the reviewed prompt.

## Verification

Local checks: **57 Node/PostgreSQL tests and 18 browser tests passed** across the platform. New tests cover:

- Profile/settings incorporation, all eight material types and three reusable templates.
- Subject guidance and rejection of unsupported settings/counts/lengths.
- Identifier/credential filtering across every free-text input, including literal regex characters in names.
- Review-gated copy, invalidation after edits, fresh-profile revision checking and clipboard rejection fallback.
- Administrator denial, disposal during pending reads, text-only rendering and 390px viewport behavior.
- No external network request or localStorage writes in the synthetic prompt workflow.

Browser copy tests stub success/rejection paths; they do not prove real iPad clipboard permissions. Local browser testing uses the temporary Chromium 133 override documented in U2; CI uses Playwright's browser. Existing database tests verify U3 RPC authorization. Full Supabase staging, real signed-session integration, physical iPad/Safari, backend/origin selection and restored backups remain release gates.

The main studio now lets managed sub-editors own their disabled controls while an inert wrapper blocks interaction during requests. This prevents the parent reload lifecycle from unintentionally enabling a child Copy/Save button that requires review or conflict recovery. Existing profile/access browser tests still pass.

## Next phase and rollback

U6 implements central importing, schema/file validation, draft preview, publishing, private storage and assignments. Nothing generated externally should be trusted or published automatically. U5 adds no migration; reverting/disabling the UI is sufficient before activation. Existing progress and offline data must not be cleared. The existing U0/U1 deployment and backup gates remain unchanged.

## U6 import contract update

Generated prompts now use template version 2 and describe the material library's version-1 JSON envelope for document or attachment drafts. Solutions are separate `answer_sheet` materials/files; practice workbooks must not include a Solutions tab that bypasses answer release. The administrator still reviews, imports, validates, publishes and assigns each item explicitly. No generated output is automatically uploaded or published.
