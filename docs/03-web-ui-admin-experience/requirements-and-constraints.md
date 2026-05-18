# Web UI Requirements and Constraints

## Page Requirements

Landing page:

- Show product name Tarkana or final configured name.
- Show tagline: "Arena nalar untuk pikiran tajam."
- Explain that Tarkana is a gamified logic challenge app.
- Include register/login CTA.
- Include disclaimer that this is not an official IQ test.
- Avoid clinical, diagnostic, medical, or official intelligence-test claims.

Authentication:

- Email register.
- Email login.
- Google login.
- Logout.
- Clear error feedback.
- Redirect authenticated users away from auth pages when appropriate.

Dashboard:

- Current rank.
- Logic rating.
- Total challenge completed.
- Best score.
- Average accuracy.
- Average solve time.
- Strongest category.
- Weakest category.
- Recent sessions.
- Start Challenge button.
- Mode selection.
- Default empty state for new users.

Challenge page:

- Question number.
- Prompt.
- Choices.
- Timer.
- Progress indicator.
- Submit button.
- No previous-question navigation in ranked mode.
- Clear expired-time behavior.
- Memory pattern reveal/hide state.

Result page:

- Final score.
- Correct and wrong answers.
- Accuracy.
- Average solve time.
- Rating change.
- Current rank.
- Rank progress.
- Promotion state if rank increased.
- Strongest and weakest category.
- Question review.
- Retry and leaderboard actions.

History page:

- User-owned session list.
- Session date.
- Challenge type.
- Total questions.
- Total score.
- Accuracy.
- Average time.
- Rating change.
- Challenge difficulty.
- Rank after session.
- Detail link to result.

Leaderboard:

- Position.
- Display name.
- Rank.
- Logic rating.
- Average accuracy.
- Total challenge completed.
- No email.
- Suspicious sessions excluded.

Profile:

- Display name setting.
- Auth provider display.
- Rank.
- Rating.
- Basic account info.
- No role editing for normal users.

Admin:

- Category management.
- Question rule management.
- Challenge config management.
- Mode active/inactive settings.
- Time limit settings.
- Difficulty configuration.
- Session overview.
- User overview.
- Simple category statistics.

## UI Style Constraints

Neo brutalism:

- bright or off-white background.
- high contrast.
- thick borders.
- hard shadows without blur.
- bold readable typography.
- simple grid layout.
- large explicit buttons.
- clear rank badges.
- high-contrast progress bars.
- dramatic but clean result page.

Implementation constraints:

- Do not build a marketing-only landing page as the entire app.
- The product experience must be reachable quickly.
- Avoid decorative-only elements that reduce clarity.
- Do not put cards inside cards.
- Do not let text overlap.
- Do not rely on color alone.
- Use icons only when they clarify action.
- Buttons must have visible disabled, hover, active, and focus states.

## Responsive Constraints

Minimum checks:

- Desktop: 1440x900.
- Tablet: 768x1024.
- Mobile: 390x844.

Responsive behavior:

- Challenge choices remain tap-friendly on mobile.
- Timer remains visible on mobile.
- Admin tables become scrollable or responsive without clipping actions.
- Dashboard statistics reflow without losing labels.
- Result review remains readable on mobile.
- No horizontal scrolling except intentional admin data tables.

## Accessibility Constraints

- Use semantic headings in order.
- Use labels for all form inputs.
- Provide aria labels for icon-only buttons.
- Focus states must be visible.
- Keyboard users can select challenge choices and submit.
- Timer state is text-visible, not color-only.
- Errors are associated with fields.
- Loading states are announced or visibly clear.
- Contrast must be sufficient in screenshots.

## Browser Verification Constraints

Any UI change requires browser-use or Playwright screenshot iteration.

Required screenshots:

- Landing desktop and mobile.
- Auth desktop and mobile.
- Dashboard empty state.
- Dashboard with populated data.
- Challenge active state.
- Challenge expired state.
- Memory challenge reveal state.
- Result page.
- History empty and populated.
- Leaderboard.
- Profile.
- Admin category/rule/config pages.
- Admin forbidden state for non-admin.

Required Playwright coverage:

- unauthenticated protected route redirects.
- dashboard default state.
- start challenge flow.
- answer submission flow.
- result page visibility.
- leaderboard email absence.
- admin route forbidden for normal user.

## Security Constraints for UI

- UI must not hide correct answers in client state before submit; the data must not be present.
- UI must not compute trusted score, rating, or rank.
- UI can display optimistic interaction state, but server result is authoritative.
- Admin controls must not appear as the only guard.
- Do not expose raw API errors.
- Do not store sensitive auth data in localStorage.

## Out of Scope

- Android UI.
- Android bottom navigation.
- Offline-first mode.
- Payment UI.
- Friend leaderboard.
- Tournament mode.
- Achievement system unless later added to PRD scope.

