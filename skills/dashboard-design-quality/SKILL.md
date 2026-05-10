---
name: dashboard-design-quality
description: Improve, review, or redesign dashboard design quality using the Japan Digital Agency Dashboard Design Guidebook. Use when Codex is asked to audit, implement, or refine dashboard screens, BI reports, analytics UIs, Power BI dashboards, KPI cards, charts, tables, wireframes, prototypes, or frontend dashboard code for clarity, layout, graph choice, accessibility, data meaning, and decision/action support.
---

# Dashboard Design Quality

Use this skill to raise the design quality of dashboards by applying the Digital Agency Dashboard Design Guidebook as a practical review and implementation rubric. The guide is most directly aimed at presentation-style dashboards: viewers should quickly understand status, notice differences, and decide what to do with minimal operation.

Primary reference:
- Read [references/digital-agency-dashboard-guide.md](references/digital-agency-dashboard-guide.md) when you need detailed criteria, chart choice guidance, accessibility checks, or a review checklist.

## Workflow

1. Establish the dashboard job.
   - Identify who views it, when and where they view it, what they need to know, and what decision or action should follow.
   - Distinguish presentation dashboards from exploratory dashboards. For exploratory dashboards, keep the same clarity and accessibility principles, but allow deeper filtering and analysis when the audience has the required domain knowledge.
   - If inputs are missing, make conservative assumptions and state them. Do not block routine implementation or review unless the missing purpose would make the design arbitrary.

2. Audit the current design from purpose to surface.
   - Purpose and scope: confirm that every visible metric, table, chart, and filter supports the viewer's decision or action.
   - Information architecture: organize from overview to detail, and from high-priority signals to supporting context.
   - Layout: align content to a stable grid, keep filters near the content they affect, and avoid requiring unnecessary interaction.
   - Chart choice: match the chart to the data relationship: time trend, category comparison, composition, exact lookup, geographic distribution, or mixed measures.
   - Graph integrity: remove decorative clutter, preserve honest scales, use meaningful ordering, and provide comparison targets where a single value is not enough.
   - Accessibility and metadata: avoid color-only meaning, provide labels or alternative access to values, include source/update/data definition context, and verify actual target viewports.

3. Improve the artifact.
   - If code or design files are available, implement the changes directly using the local design system and existing UI patterns.
   - Prefer compact, scan-friendly dashboard surfaces over landing-page or marketing compositions.
   - Preserve useful density. Improve hierarchy, grouping, spacing, chart semantics, labels, and contrast before introducing new components.
   - Remove redundant visuals, 3D effects, heavy shadows, ornamental images, and unclear legends unless they serve a measurable comprehension purpose.

4. Validate before delivery.
   - Check whether the dashboard answers the viewer's core question without reading instructions.
   - Verify layout and text at likely desktop and mobile/tablet sizes when relevant.
   - For frontend dashboards, run available tests or visual checks. Use browser screenshots when a local app is available.
   - For public-sector or public dashboards, check alternative text, data table or downloadable data availability, and summary text expectations.

## Output

When reviewing, lead with prioritized findings and concrete fixes. Include file or screen references when available.

When implementing, summarize the design changes in terms of user comprehension: what became easier to see, compare, trust, or act on. Mention remaining assumptions or checks, especially around data definitions, update frequency, and accessibility artifacts that require product or data-owner input.

