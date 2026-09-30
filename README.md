# Course Hub – Extending Social Protection to Migrant Workers, Refugees and their Families

Participant-facing hub for the ITCILO online course (code A9719043, 19 October – 27 November 2026).
Plain HTML, CSS and JavaScript: no build step. Open `index.html`, or publish the repository root with GitHub Pages.

## Structure

```
index.html              page shell, static sections (Overview, Course requirements, Participants, Feedback)
assets/css/styles.css   all styling; palette tokens (derived from the hero image) are at the top
assets/js/data.js       content data: weeks, sessions, resource persons, participants, feedback link
assets/js/main.js       section routing, mobile menu, rendering of timetable / people / participants
assets/images/          itcilo-logo.png, hero.png (+ webp variants; hero-banner*.webp adds headroom above the birds), people/ (photos)
simulation/within-reach.html   self-contained decision simulation, embedded in the "Simulation: Within reach" tab
```

## Things to fill in later (all in `assets/js/data.js`)

- **Zoom links:** set `zoomUrl` on each session, e.g. `"zoomUrl": "https://..."`. Until then the button is a placeholder.
- **Feedback form:** set `config.feedbackUrl` to the form address. Until then the button is a placeholder.
- **Resource person photos:** save an image in `assets/images/people/` and set `photo` to e.g. `"assets/images/people/name.jpg"`. Add `role` if a title is confirmed.
- **Participants:** add entries to `participants`, e.g. `{ "name": "…", "organisation": "…", "country": "…" }`. Only list details participants have agreed to share.
- **Confirmed names:** remove `tbc` / `partial` on a person once the agenda is confirmed.

## Content sources

Course Information Note, Annotated Agenda (sessions, dates, times, speakers), course requirement screenshots, supplied hero image and ITCILO logo. Cover image © Samuele Omati.
