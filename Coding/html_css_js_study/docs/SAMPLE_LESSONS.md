# Web Studio sample lessons

Phase 3 is limited to three sample lessons so the learning flow can be reviewed before a full curriculum is prepared. The explanations, reading-card project, practice tasks and questions are written for Commonplace. No full transcript or study-book PDF is copied into the repository.

## Base material and scope reviewed

The course is Angela Yu’s *The Complete 2022 Web Development Bootcamp* (The App Brewery, Udemy). Its existing index is recorded in `data/course-index.js`; the user’s study books are linked from that file.

| Sample | Material consulted | Scope of this sample |
| --- | --- | --- |
| Structure a reading card | [Section 2 study book](https://drive.google.com/file/d/1TLy70eu9-Nvp1lDHjRwFYqHe8UXgFtdM/view), lessons 12, 13 and 16 on HTML introduction, tag anatomy and text structure | Elements, matching tags, headings and paragraphs; a small original card also demonstrates class/id attributes and a button. |
| Style the card | [Section 4 study book](https://drive.google.com/file/d/1xNj7_wJc8Oicp_pVQMNdmzWV7uQB_jkb/view), lessons 36–38 on syntax, selectors and classes/IDs; [Section 5 study book](https://drive.google.com/file/d/1vYBOPzwt8vdS_6pDgK_2ALA1Hq83sEOQ/view), lesson 44 on the box model | Matching a class selector, writing declarations, comparing padding and margin, and changing spacing and corner radius. |
| Make the button count | The topic outline in the [full study book](https://drive.google.com/file/d/1NOtYJLB9afRUUYKo7Vn905Szrgzq2Gm4/view): Section 9 variables/arithmetic, Section 11 DOM selection/text, Section 13 events | An original bridge lesson combining these topics. Detailed JavaScript transcripts have **not** been reviewed for this sample. |

The JavaScript APIs were checked against the primary documentation maintained by MDN:

- [Document.querySelector](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)
- [EventTarget.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [Node.textContent](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)

The samples do not claim that the complete course or all study books have been reviewed. The 453 entries in the original tracker remain an index, not 453 integrated lessons. Preparing the full curriculum is deferred.

## Review path

Each sample retains eight reading parts, a prediction, a practice challenge with hints, one five-question check, a reading mark, notes and bookmarks. All three lessons use the same editable project:

1. HTML: change the heading and run the page.
2. CSS: compare 8px and 32px padding on the same card.
3. JavaScript: change the increment from 1 to 2; run again and click twice to see `Clicks: 4`.
4. Complete a chapter’s check, mark it read, add a note and bookmark a part, then reload to check saved progress.

**Open practice** keeps existing edits. It opens the relevant file in the shared project rather than replacing code with a displayed excerpt. **Restore example** asks before replacing the three project files; notes, bookmarks and reading progress remain. The HTML editor holds a content fragment: the preview supplies its document wrapper and connects CSS and JavaScript. Running a fresh preview restarts the counter’s in-memory value.

## Storage and delivery boundaries

The stable lesson IDs are `html-elements`, `css-spacing` and `js-events`. Their reading-part order, quiz choice order, answers and prediction choices remain unchanged so existing records keep their meaning. Existing code wins over starter defaults on load.

The three sample lessons are bundled with the app and included in its verified [offline study pack](OFFLINE_STUDY.md). Native learning records participate in [account sync](CLOUD_SYNC.md); shared highlights and downloaded packs remain local. Drive source links and external course resources require internet. The original course index is included offline, but its 453 entries are not 453 downloaded lessons. Physical-device acceptance remains in [Phase 7](PHASE7_VALIDATION.md).
