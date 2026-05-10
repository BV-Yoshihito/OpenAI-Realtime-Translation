# Digital Agency Dashboard Guide Reference

This is a compact, paraphrased working reference derived from the Digital Agency's "Dashboard Design Guidebook" materials:

- Official resource page: https://www.digital.go.jp/resources/dashboard-guidebook
- Guidebook PDF shared by the user: https://drive.google.com/file/d/11tjGulwCtnOhvQkCvNhXA-cp2vzkP5qp/view?usp=sharing
- Official guidebook update date on the Digital Agency page: 2026-03-31

Use this as a practical rubric. Do not copy long passages from the source guide into user deliverables. Cite the official page when explaining where the rubric comes from.

## Scope

The guide focuses on the visualization layer of dashboards: layout, chart expression, prototyping, implementation checks, and accessibility. It does not cover upstream data collection, ETL, warehousing, or detailed data cleansing.

The central pattern is the presentation dashboard: a viewer can grasp the situation, notice relevant changes or anomalies, and decide whether action is needed. Exploratory dashboards can still use these standards, but may legitimately require more domain knowledge, filtering, and drilldown.

## Process

Use a three-stage process:

1. Requirements
   - Define the purpose.
   - Clarify constraints around the dashboard itself and the available data.
2. Prototyping
   - List the information that might be needed.
   - Build a rough layout first, then a more realistic mock.
   - Discuss with intended viewers and stakeholders, then revise.
3. Implementation
   - Build the dashboard in the chosen tool.
   - Run a final checklist covering user experience, chart design, technical behavior, data design, and accessibility.

## Requirements Prompts

Capture these before deep design work:

- Why: final objective and reason the dashboard exists.
- What / so what: information the viewer must know, data required, and judgment or action after viewing.
- Who: viewer role, organization, workflow, and data literacy.
- When: viewing timing, review cadence, and expected freshness.
- Where: location, device, display size, and viewing environment.
- How: functions, data fields, update frequency, and interaction needs.

Treat the highest-level purpose and viewing purpose as relatively stable. Treat specific dashboard contents as testable through prototypes.

## Constraints

Watch for these dashboard constraints:

- Too many types of information.
- Subject matter too complex for the intended quick-reading experience.
- No recurring viewing need.

Watch for these data constraints:

- Missing or unreliable data.
- Insufficient update frequency.
- Data not available at the needed granularity.
- Metrics that cannot be compared meaningfully.

Respond by reducing information types, lowering interaction or conceptual complexity, and testing whether the prototype still communicates the necessary information.

## Information Selection

Select information using four principles:

- Purpose fit: remove data that does not shorten the path from seeing to judging or acting.
- Decomposition: provide enough granularity for the viewer to move from whole to part.
- Difference visibility: make outliers, rank differences, and trend direction easy to notice.
- Freshness: reflect the latest useful data and make the update process credible.

When a single number is hard to interpret, pair it with a comparison: target, previous period, prior year, average, threshold, or benchmark.

## Layout

Design from overview to detail:

- Put the strongest whole-picture signal where the viewer starts scanning, usually the upper-left area for left-to-right reading contexts.
- Move from high-level metrics to supporting tables and charts as the eye travels across and down the page.
- Place filters at the top or left, and place affected content below or to the right so the relationship is visible.
- Use pages or navigation when information volume exceeds what a single view can support.
- Require few operations for the core task. A presentation dashboard should not make the viewer hunt.
- Use a stable grid. The Digital Agency template uses a 16:9 canvas that can be divided flexibly from 2 to 6 segments vertically and horizontally.

For implementation, preserve alignment, equal gutters, predictable card/chart dimensions, and clear visual grouping. Do not use nested cards or decorative framing that makes scanning harder.

## Chart Choice

Choose charts by the relationship being communicated:

- KPI card or metric: latest value, key ratio, total, or status that needs immediate attention.
- Line chart: time on the x-axis, change over time, trend, and seasonality.
- Bar chart: comparison across categories. Use horizontal bars when labels are long or ranking is important.
- Grouped bar: compare multiple series within each category when direct category-by-category comparison matters.
- Stacked bar: show part-to-whole composition across categories when totals and components both matter.
- Area chart: show trend plus composition over time. If composition is not important, prefer a line chart.
- 100% stacked area or bar: show composition share over time or categories, not absolute magnitude.
- Pie or donut: only for compact part-to-whole communication when the total is clear and the number of categories is small. A bar chart is often more accurate.
- Table: exact lookup, detailed values, or many fields. Make sorting, units, and row hierarchy clear.
- Map: geographic distribution or regional differences. Pair with ranking or table views when exact comparison is important.
- Combo chart: related measures that need to be read together. Use sparingly and label axes clearly.

Avoid selecting a chart because it looks impressive. Select the chart that makes the intended comparison easiest.

## Graph Design Principles

Help viewers know what they need to know:

- Simplify the graphic by removing redundant labels, heavy gridlines, ornamental imagery, and repeated explanations.
- Sort by a meaningful order: magnitude, time, workflow order, geography, or another viewer-recognized sequence.
- Use visual emphasis for the most important signal through size, weight, position, and restrained color.
- Keep loading and interaction response fast enough that the viewer does not abandon the task.

Avoid misunderstanding:

- Write titles, series names, units, and date ranges plainly.
- Make data definitions, source, update date, as-of date, annotations, and caveats accessible.
- Do not distort with arbitrary axis ranges, omitted value ranges, or visual encodings that exaggerate or minimize differences.
- Use a zero baseline for bar charts unless there is a defensible, clearly labeled exception.
- Put legends close to the chart and align legend order with visual order where possible.

## Color And Accessibility

The Digital Agency materials provide seven Power BI template palette families: Solid Gray, Blue, Light Blue, Cyan, Green, Orange, and Red. Use palettes as a restrained system, not as decoration.

Practical rules:

- Limit chart colors, commonly 1 to 5 colors, so the highlighted series or category remains clear.
- Do not encode meaning by color alone. Add direct labels, symbols, patterns, line styles, or position.
- Check color-vision accessibility for multi-color charts.
- Aim for at least 3:1 contrast between chart color areas and the background. If this is not possible, place numeric values near the colored areas or expose values on hover and keyboard focus.
- Text and numeric labels should meet stronger contrast expectations, commonly 4.5:1 against the background.
- Make keyboard focus and hover states expose equivalent information.
- Provide alternative text for charts.
- For public dashboards, provide the underlying data as a file or HTML table where appropriate.
- For public dashboards, provide a summarized text version of the dashboard's key findings when appropriate.

## Review Checklist

Use these checks as a final gate.

User experience:

- The viewer can find information needed for judgment or action.
- A whole-picture metric or baseline is available before detailed charts.
- Information is limited to what is genuinely useful.
- The core task requires minimal operation.
- Navigation to the needed information is obvious.
- Feedback from multiple representative viewers has been considered when possible.

Metrics, tables, and charts:

- The most important numbers draw attention first.
- Chart and table ordering supports comprehension.
- Legends are near the visuals they explain.
- Comparisons or trend changes make differences easy to notice.
- Chart colors are restrained and purposeful.
- Gridlines, borders, and other chart furniture are minimal.
- 3D, heavy shadow, decorative imagery, and unrelated rich effects are absent.
- Titles and series names are understandable and not misleading.
- Bar-chart baselines start at zero unless there is a labeled reason.
- Data update date or as-of date is visible or easy to find.

Technical:

- The dashboard renders and works in the actual target devices and display contexts.
- Loading and interaction performance are acceptable.

Data design:

- Data supports the viewer's purpose.
- Data can be decomposed to the level the viewer needs.
- Update cadence matches the viewing cadence.
- Comparison values exist when raw quantities alone are insufficient.
- Definitions are available for metrics and derived values.

Accessibility:

- Color is not the only way to identify chart meaning.
- Charts have useful alternative text.
- Source data is available where appropriate.
- A text summary is available for public dashboards where appropriate.

