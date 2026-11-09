# CPF Forecast Calculator

A Voyage Wealth Advisory tool that forecasts CPF balances (OA, SA/RA, MA) year
by year, with salary contributions, interest, MediSave overflow, RA formation
at 55 and CPF LIFE payouts.

Open `index.html` in a browser to use it. There is no install or build step,
and nothing you enter leaves the browser.

## What it models

- Contributions from salary and bonuses, with yearly salary increases, using
  CPF's rates by year (including the higher rates for ages 55 to 65 from 2027),
  graduated rates for SPRs in their 1st and 2nd year, and MediSave-only
  contributions for the self-employed
- Interest, including the extra interest on the first $60,000 (and the
  additional extra interest from 55)
- MediSave savings above the Basic Healthcare Sum (BHS) moving to SA/RA, then OA
- Housing paid from OA: a one-off payment and monthly loan payments
- Insurance premiums paid from MediSave
- Cash top-ups to SA/RA and MediSave, OA-to-SA/RA transfers, within CPF's
  limits, and Matched Retirement Savings Scheme grants
- RA formation at 55 (FRS or ERS, property pledge), and how much can be
  withdrawn then
- CPF LIFE payouts (Standard, Escalating, Basic), with deferral to 70
- Optionally, projected retirement sums and BHS for years CPF hasn't
  published yet

## Using it

Fill in the form and press **Calculate**. On a wide screen the form shows in
two columns: your details, work and forecast settings on the left, and the
optional sections (housing, MediSave premiums, top-ups) and "At 55" choices on
the right. On a phone it is one column.

Results show headline figures, a chart, and the year-by-year table, with notes
on the years where something important happens (the RA is formed, payouts
start, OA can't cover the housing payments). You can:

- **Compare scenarios:** keep one forecast, change the form, and calculate again
  to see both side by side with the difference.
- **Download a CSV** of the table, or **print or save as PDF**.
- **Share a link:** the address bar holds a link to the forecast. The numbers
  are in the part after `#`, which browsers don't send to the web server, but
  anyone given the link can see them.

## Accuracy and limits

This is an estimate, not advice. In particular:

- Each row is a calendar year. Enter today's balances: the first year counts
  only the months still to come (contributions, housing loan payments and
  MediSave premiums), so contributions already in your balances aren't
  counted twice.
- Contribution and allocation rates change from the month after each
  birthday, as CPF's do (at 35, 45, 50, 55, 60, 65 and 70).
- Contributions are credited monthly, so a year's contributions earn about 5.5
  months of interest in that year.
- Other events happen at the start of the year you reach the age: the RA is
  formed in the year you turn 55, and CPF LIFE starts in the year you choose.
  This matches CPF's own payout estimates, which assume 10 years of growth
  from 55 to 65.
- Years after CPF's latest published figures reuse the latest ones, unless you
  tick the option to project retirement sums and the BHS. The interest rate
  floors are assumed to carry on.
- CPF only publishes Standard Plan payout estimates, and only for men. For
  women the calculator takes 7% off the men's figure and labels it as
  approximate. That 7% is not a CPF figure: CPF's 2025 payout examples give
  each payout as a range about 7% wide, with the top matching CPF's men's
  figures. It is set in `config.js` (`femalePayoutReduction`).
- For Escalating and Basic, and for anyone who wants their own figure, enter
  the starting payout from CPF's Monthly Payout Estimator; it is used as
  entered, with no adjustment.

## Files

| File | Holds |
|---|---|
| `cpf-data.js` | The database: every CPF figure and rule. Update this when CPF announces new figures. |
| `cpf-lookups.js` | Functions that read the database |

**Shared with the BTO Planner:** its pages load `cpf-data.js` and `cpf-lookups.js`
from this site, so a CPF figure updated here updates both apps. Don't rename or
remove anything in those two files without checking the BTO Planner (its tests
read them from a copy of this repo cloned next to it).

| `config.js` | App settings: form defaults and modelling assumptions |
| `engine.js` | The forecast calculations |
| `app.js` | The page: form, results, chart, sharing and export |
| `index.html`, `style.css` | Page layout and styling |
| `assets/` | The VWA logo for the browser tab and home-screen shortcuts (from vwagroup.sg) |
| `tests/` | Checks of the calculations against CPF's published rates, rules and examples |

## Tests

Run them after changing `cpf-data.js` or the calculations (Node 18 or later):

```
node --test
```

They check contributions, extra interest, the BHS, RA formation at 55,
MediSave overflow, top-up limits and CPF LIFE payouts against CPF's own
figures. When CPF changes a figure on purpose, update the matching test.

## Updating it

- **New CPF figures:** add or change rows in `cpf-data.js`; nothing else needs
  to change. Its comments say when CPF usually announces each figure. The
  figures were last checked against cpf.gov.sg on 5 November 2026.
- **Default values:** change them in `config.js`.
- **A new setting:** add it to `config.js` with its default, and add a form
  field in `index.html` whose `id` is the setting's name. The form fills the
  field from the default, and passes the field's value to the calculations
  as the same type as the default. Then use `config.<name>` in `engine.js`.
- **Colours and fonts:** the colours are set once at the top of `style.css`,
  taken from the Voyage Wealth Advisory website (vwagroup.sg): navy
  `#1B1464`, gold `#C99E10`, with cream and soft blue as accents. The fonts
  are Jost and Cormorant Garamond, loaded from Google Fonts; without an
  internet connection the page falls back to the system font.

## History

- **Branding:** restyled in the Voyage Wealth Advisory colours and fonts, with
  a navy header and footer and gold accents.
- **Wider layout:** the page widened from 720px to 1440px so the forecast table
  fits on a typical laptop or desktop screen, with a two-column form on wide
  screens and a chart drawn at the screen's width.
- **Code tidy-up:** removed duplicated code without changing any results, and
  fixed the bonus field still showing for self-employed members.
